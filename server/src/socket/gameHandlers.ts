import { Server, Socket } from "socket.io";
import { awardPoints } from "../services/pointsService";
import { addParticipantPoints, getRoomByCode } from "../services/roomService";
import { GameType } from "@waddle/shared";
import type {
  GameStartPayload,
  MazeMovePayload,
  MazeCompletePayload,
  BreadcrumbTapPayload,
  PictionaryDrawPayload,
  PictionaryGuessPayload,
  GameResult,
} from "@waddle/shared";

// Track active game states per room
interface GameSession {
  gameType: GameType;
  startedAt: number;
  word?: string; // Pictionary
  drawer?: string; // Pictionary userId
  scores: Map<string, number>; // userId → score
  completed: Set<string>; // userIds who finished
}

const activeGames = new Map<string, GameSession>();

const PICTIONARY_WORDS = [
  "goose", "pond", "study", "timer", "book", "pencil", "coffee",
  "laptop", "headphones", "clock", "sleep", "exercise", "water",
  "sunrise", "library", "notes", "flashcard", "homework",
];

function randomWord(): string {
  return PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
}

function calculateGamePoints(gameType: GameType, score: number, rank: number): number {
  const base: Record<GameType, number> = {
    [GameType.MAZE]: 30,
    [GameType.BREADCRUMB]: 20,
    [GameType.PICTIONARY]: 25,
  };
  const rankBonus = rank === 1 ? 15 : rank === 2 ? 10 : 5;
  return Math.min(base[gameType] + rankBonus, 50);
}

export function registerGameHandlers(io: Server, socket: Socket) {
  const userId = (socket as Socket & { userId?: string }).userId;

  // game-start (host initiates a break game)
  socket.on("game-start", async (payload: GameStartPayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;

    const room = await getRoomByCode(roomCode);
    if (!room || room.hostId !== userId) return;

    const gameType = payload.gameType;
    const session: GameSession = {
      gameType,
      startedAt: Date.now(),
      scores: new Map(),
      completed: new Set(),
    };

    let gameData: Record<string, unknown> = {};

    if (gameType === GameType.PICTIONARY) {
      session.word = randomWord();
      // Pick a random non-host participant as drawer
      const nonHosts = room.participants.filter((p) => !p.isHost);
      session.drawer =
        nonHosts.length > 0
          ? nonHosts[Math.floor(Math.random() * nonHosts.length)].userId
          : userId;

      // Tell drawer the word privately
      const drawerSocket = [...io.sockets.sockets.values()].find(
        (s) => (s as Socket & { userId?: string }).userId === session.drawer
      );
      if (drawerSocket) {
        drawerSocket.emit("pictionary-word", { word: session.word });
      }

      gameData = { drawer: session.drawer, wordLength: session.word.length };
    } else if (gameType === GameType.MAZE) {
      // Simple 8x8 maze seed
      gameData = { seed: Math.floor(Math.random() * 1000), size: 8 };
    } else if (gameType === GameType.BREADCRUMB) {
      gameData = { duration: 30, crumbCount: 20 };
    }

    activeGames.set(roomCode, session);

    io.to(roomCode).emit("game-start", {
      roomCode,
      gameType,
      gameData,
    });
  });

  // maze-move — broadcast player's position to room
  socket.on("maze-move", (payload: MazeMovePayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;
    socket.to(roomCode).emit("maze-move", payload);
  });

  // maze-complete — player reached the end
  socket.on("maze-complete", async (payload: MazeCompletePayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const session = activeGames.get(roomCode);
    if (!session || session.gameType !== GameType.MAZE) return;

    session.completed.add(userId);
    const rank = session.completed.size;
    const timeScore = Math.max(0, 60 - payload.timeSeconds); // Faster = more points
    session.scores.set(userId, timeScore);

    io.to(roomCode).emit("maze-complete", { userId, rank, timeSeconds: payload.timeSeconds });

    // End game when all players complete or after 90 seconds
    const room = await getRoomByCode(roomCode);
    if (room && session.completed.size >= room.participants.length) {
      await endGame(io, roomCode, session);
    }
  });

  // breadcrumb-tap — player tapped a breadcrumb
  socket.on("breadcrumb-tap", (payload: BreadcrumbTapPayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const session = activeGames.get(roomCode);
    if (!session || session.gameType !== GameType.BREADCRUMB) return;

    const current = session.scores.get(userId) ?? 0;
    session.scores.set(userId, current + 1);

    socket.to(roomCode).emit("breadcrumb-tap", { userId, score: current + 1 });
  });

  // breadcrumb-game-end (timer ran out on client)
  socket.on("breadcrumb-end", async (payload: { roomCode: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const room = await getRoomByCode(roomCode);
    if (!room || room.hostId !== userId) return; // Only host can end

    const session = activeGames.get(roomCode);
    if (session && session.gameType === GameType.BREADCRUMB) {
      await endGame(io, roomCode, session);
    }
  });

  // pictionary-draw — broadcaster draws
  socket.on("pictionary-draw", (payload: PictionaryDrawPayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;
    socket.to(roomCode).emit("pictionary-draw", payload);
  });

  // pictionary-guess — others guess
  socket.on("pictionary-guess", async (payload: PictionaryGuessPayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const session = activeGames.get(roomCode);
    if (!session || session.gameType !== GameType.PICTIONARY || !session.word) return;
    if (session.completed.has(userId)) return; // Already guessed correctly

    const isCorrect =
      payload.guess.trim().toLowerCase() === session.word.toLowerCase();

    if (isCorrect) {
      const elapsedSeconds = Math.floor((Date.now() - session.startedAt) / 1000);
      const score = Math.max(10, 60 - elapsedSeconds);
      session.scores.set(userId, score);
      session.completed.add(userId);

      io.to(roomCode).emit("pictionary-guess", {
        userId,
        correct: true,
        guess: payload.guess,
      });

      // Drawer also gets points for each correct guess
      if (session.drawer) {
        const drawerScore = (session.scores.get(session.drawer) ?? 0) + 5;
        session.scores.set(session.drawer, drawerScore);
      }

      // End game if everyone guessed
      const room = await getRoomByCode(roomCode);
      const guesserCount = room
        ? room.participants.filter((p) => p.userId !== session.drawer).length
        : 0;

      if (session.completed.size >= guesserCount) {
        await endGame(io, roomCode, session);
      }
    } else {
      io.to(roomCode).emit("pictionary-guess", {
        userId,
        correct: false,
        guess: payload.guess,
      });
    }
  });

  // game-end (host manually ends game)
  socket.on("game-end", async (payload: { roomCode: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;

    const room = await getRoomByCode(roomCode);
    if (!room || room.hostId !== userId) return;

    const session = activeGames.get(roomCode);
    if (session) {
      await endGame(io, roomCode, session);
    }
  });
}

async function endGame(io: Server, roomCode: string, session: GameSession) {
  activeGames.delete(roomCode);

  const room = await getRoomByCode(roomCode);
  if (!room) return;

  // Sort scores to determine rank
  const sortedScores = [...session.scores.entries()].sort((a, b) => b[1] - a[1]);

  const results: GameResult[] = await Promise.all(
    sortedScores.map(async ([uid, score], index) => {
      const participant = room.participants.find((p) => p.userId === uid);
      const pointsAwarded = calculateGamePoints(session.gameType, score, index + 1);

      await awardPoints(uid, pointsAwarded, `${session.gameType} game in flock ${roomCode}`);
      await addParticipantPoints(room.id, uid, pointsAwarded);

      return {
        userId: uid,
        username: participant?.username ?? "Unknown",
        score,
        pointsAwarded,
      };
    })
  );

  io.to(roomCode).emit("game-end", {
    roomCode,
    gameType: session.gameType,
    results,
  });
}
