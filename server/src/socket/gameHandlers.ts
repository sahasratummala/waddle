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
import { randomPictionaryWord } from "../lib/pictionaryWords";

export interface GameSession {
  gameType: GameType;
  startedAt: number;
  word?: string;
  winner?: string;
  drawer?: string;
  scores: Map<string, number>;
  completed: Set<string>;
}

export const activeGames = new Map<string, GameSession>();

function calculateGamePoints(gameType: GameType, _score: number, rank: number): number {
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

  socket.on("game:start", async (payload: { roomCode: string; game: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;

    const room = await getRoomByCode(roomCode);
    if (!room || room.hostId !== userId) return;

    const word = randomPictionaryWord();
    const session: GameSession = {
      gameType: GameType.PICTIONARY,
      startedAt: Date.now(),
      word,
      scores: new Map(),
      completed: new Set(),
    };
    activeGames.set(roomCode, session);

    io.to(roomCode).emit("pictionary:word", { word });
    io.to(roomCode).emit("game:started", { game: payload.game });
  });

  socket.on("pictionary:request-word", (payload: { roomCode: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;
    const session = activeGames.get(roomCode);
    if (session?.word) {
      socket.emit("pictionary:word", { word: session.word });
    }
  });

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
      session.word = randomPictionaryWord();
      const nonHosts = room.participants.filter((p) => !p.isHost);
      session.drawer =
        nonHosts.length > 0
          ? nonHosts[Math.floor(Math.random() * nonHosts.length)].userId
          : userId;

      const drawerSocket = [...io.sockets.sockets.values()].find(
        (s) => (s as Socket & { userId?: string }).userId === session.drawer
      );
      if (drawerSocket) {
        drawerSocket.emit("pictionary-word", { word: session.word });
      }

      gameData = { drawer: session.drawer, wordLength: session.word!.length };
    } else if (gameType === GameType.MAZE) {
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

  socket.on("maze-move", (payload: MazeMovePayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;
    socket.to(roomCode).emit("maze-move", payload);
  });

  socket.on("maze-complete", async (payload: MazeCompletePayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const session = activeGames.get(roomCode);
    if (!session || session.gameType !== GameType.MAZE) return;

    session.completed.add(userId);
    const rank = session.completed.size;
    const timeScore = Math.max(0, 60 - payload.timeSeconds);
    session.scores.set(userId, timeScore);

    io.to(roomCode).emit("maze-complete", { userId, rank, timeSeconds: payload.timeSeconds });

    const room = await getRoomByCode(roomCode);
    if (room && session.completed.size >= room.participants.length) {
      await endGame(io, roomCode, session);
    }
  });

  socket.on("breadcrumb-tap", (payload: BreadcrumbTapPayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const session = activeGames.get(roomCode);
    if (!session || session.gameType !== GameType.BREADCRUMB) return;

    const current = session.scores.get(userId) ?? 0;
    session.scores.set(userId, current + 1);

    socket.to(roomCode).emit("breadcrumb-tap", { userId, score: current + 1 });
  });

  socket.on("breadcrumb-end", async (payload: { roomCode: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const room = await getRoomByCode(roomCode);
    if (!room || room.hostId !== userId) return;

    const session = activeGames.get(roomCode);
    if (session && session.gameType === GameType.BREADCRUMB) {
      await endGame(io, roomCode, session);
    }
  });

  socket.on("pictionary-draw", (payload: PictionaryDrawPayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;
    socket.to(roomCode).emit("pictionary-draw", payload);
  });

  socket.on("pictionary-guess", async (payload: PictionaryGuessPayload) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    const session = activeGames.get(roomCode);
    if (!session || session.gameType !== GameType.PICTIONARY || !session.word) return;
    if (session.completed.has(userId)) return;

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

      if (session.drawer) {
        const drawerScore = (session.scores.get(session.drawer) ?? 0) + 5;
        session.scores.set(session.drawer, drawerScore);
      }

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

  // game:points-earned — client reports points it awarded itself (e.g. breadcrumb)
  socket.on("game:points-earned", async (payload: { roomCode: string; points: number }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId || !payload.points) return;
    const room = await getRoomByCode(roomCode);
    if (!room) return;
    await addParticipantPoints(room.id, userId, payload.points);
    const participant = room.participants.find((p) => p.userId === userId);
    const newTotal = (participant?.pointsEarned ?? 0) + payload.points;
    io.to(roomCode).emit("participant-points", { userId, pointsEarned: newTotal });
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

  const sortedScores = [...session.scores.entries()].sort((a, b) => b[1] - a[1]);

  const results: GameResult[] = await Promise.all(
    sortedScores.map(async ([uid, score], index) => {
      const participant = room.participants.find((p) => p.userId === uid);
      const pointsAwarded = calculateGamePoints(session.gameType, score, index + 1);

      await awardPoints(uid, pointsAwarded, `${session.gameType} game in flock ${roomCode}`);
      await addParticipantPoints(room.id, uid, pointsAwarded);

      const newTotal = (participant?.pointsEarned ?? 0) + pointsAwarded;
      io.to(roomCode).emit("participant-points", { userId: uid, pointsEarned: newTotal });

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