import { Server, Socket } from "socket.io";
import { pointsService } from "../services/pointsService";

// Points awarded per game
const POINTS = {
  maze_win: 50,
  breadcrumb_first: 40,
  breadcrumb_second: 25,
  breadcrumb_third: 15,
  pictionary_win: 45,
};

// Goose-themed prompts for Pictionary
const PICTIONARY_PROMPTS = [
  "goose in a top hat",
  "goose riding a bicycle",
  "goose eating pizza",
  "goose at the beach",
  "gosling hatching from an egg",
  "goose playing guitar",
  "goose in a raincoat",
  "goose astronaut",
  "goose chasing someone",
  "goose doing yoga",
  "a flock of geese",
  "goose with sunglasses",
  "goose at a birthday party",
  "goose reading a book",
  "goose flying south",
];

// In-memory room game state (replace with Redis for production)
const roomGameState = new Map<
  string,
  {
    game: string;
    mazeSeed?: number;
    pictionaryPrompt?: string;
    pictionaryDrawerId?: string;
    breadcrumbScores?: Map<string, { username: string; taps: number }>;
    winner?: string;
  }
>();

export function registerGameHandlers(io: Server, socket: Socket) {
  const { roomCode, userId, username } = socket.data as {
    roomCode: string;
    userId: string;
    username: string;
  };

  // ─── Generic: Host starts a game ────────────────────────────────────────────
  socket.on("game:start", ({ roomCode: rc, game }: { roomCode: string; game: string }) => {
    const state: ReturnType<typeof roomGameState.get> = {
      game,
      winner: undefined,
    };
    roomGameState.set(rc, state);
    io.to(rc).emit("game:started", { game });
  });

  // ─── MAZE ───────────────────────────────────────────────────────────────────

  // Host broadcasts maze seed so all players build the same maze
  socket.on(
    "maze:sync_seed",
    ({ roomCode: rc, seed }: { roomCode: string; seed: number }) => {
      const state = roomGameState.get(rc);
      if (state && !state.mazeSeed) {
        state.mazeSeed = seed;
        io.to(rc).emit("maze:seed", seed);
      } else if (state?.mazeSeed) {
        // Late joiner: send the existing seed
        socket.emit("maze:seed", state.mazeSeed);
      }
    }
  );

  socket.on(
    "maze:solved",
    async ({
      roomCode: rc,
      userId: uid,
      username: uname,
    }: {
      roomCode: string;
      userId: string;
      username: string;
    }) => {
      const state = roomGameState.get(rc);
      if (!state || state.winner) return; // already solved
      state.winner = uid;

      io.to(rc).emit("maze:winner", { userId: uid, username: uname });

      // Award points
      try {
        await pointsService.awardPoints(uid, POINTS.maze_win, "maze_win");
      } catch (err) {
        console.error("Points award failed:", err);
      }
    }
  );

  // ─── BREADCRUMB ─────────────────────────────────────────────────────────────

  socket.on(
    "breadcrumb:tap",
    ({
      roomCode: rc,
      userId: uid,
      username: uname,
      taps,
    }: {
      roomCode: string;
      userId: string;
      username: string;
      taps: number;
    }) => {
      const state = roomGameState.get(rc);
      if (!state) return;

      if (!state.breadcrumbScores) {
        state.breadcrumbScores = new Map();
      }

      state.breadcrumbScores.set(uid, { username: uname, taps });

      // Broadcast updated leaderboard
      const scores = Array.from(state.breadcrumbScores.entries()).map(([id, s]) => ({
        userId: id,
        username: s.username,
        taps: s.taps,
      }));

      io.to(rc).emit("breadcrumb:score_update", { scores });
    }
  );

  socket.on(
    "breadcrumb:final_score",
    async ({
      roomCode: rc,
      userId: uid,
      username: uname,
      taps,
    }: {
      roomCode: string;
      userId: string;
      username: string;
      taps: number;
    }) => {
      const state = roomGameState.get(rc);
      if (!state) return;

      if (!state.breadcrumbScores) state.breadcrumbScores = new Map();
      state.breadcrumbScores.set(uid, { username: uname, taps });

      const sockets = await io.in(rc).fetchSockets();
      const totalPlayers = sockets.length;
      const submitted = state.breadcrumbScores.size;

      // Wait until all players have submitted
      if (submitted < totalPlayers) return;

      const rankings = Array.from(state.breadcrumbScores.entries())
        .map(([id, s]) => ({ userId: id, username: s.username, taps: s.taps }))
        .sort((a, b) => b.taps - a.taps);

      io.to(rc).emit("breadcrumb:results", { rankings });

      // Award points
      const pointMap = [POINTS.breadcrumb_first, POINTS.breadcrumb_second, POINTS.breadcrumb_third];
      await Promise.allSettled(
        rankings.slice(0, 3).map((r, i) =>
          pointsService.awardPoints(r.userId, pointMap[i], `breadcrumb_rank_${i + 1}`)
        )
      );
    }
  );

  // ─── PICTIONARY ─────────────────────────────────────────────────────────────

  socket.on("pictionary:request_start", async ({ roomCode: rc }: { roomCode: string }) => {
    const prompt = PICTIONARY_PROMPTS[Math.floor(Math.random() * PICTIONARY_PROMPTS.length)];
    const sockets = await io.in(rc).fetchSockets();
    if (sockets.length === 0) return;

    // Pick a random drawer
    const drawerSocket = sockets[Math.floor(Math.random() * sockets.length)];
    const drawerId = drawerSocket.data.userId;

    const state = roomGameState.get(rc)!;
    state.pictionaryPrompt = prompt;
    state.pictionaryDrawerId = drawerId;

    io.to(rc).emit("pictionary:start", { drawerId, prompt });
    // Only the drawer gets the prompt in plaintext (others shouldn't see it)
    drawerSocket.emit("pictionary:your_turn", { prompt });
  });

  socket.on(
    "pictionary:stroke",
    ({ roomCode: rc, stroke }: { roomCode: string; stroke: unknown }) => {
      socket.to(rc).emit("pictionary:new_stroke", stroke);
    }
  );

  socket.on("pictionary:clear", ({ roomCode: rc }: { roomCode: string }) => {
    socket.to(rc).emit("pictionary:clear");
  });

  socket.on(
    "pictionary:ai_guessed",
    async ({
      roomCode: rc,
      guess,
    }: {
      roomCode: string;
      prompt: string;
      guess: string;
    }) => {
      const state = roomGameState.get(rc);
      if (!state || state.winner) return;

      // The drawer gets the points when AI guesses correctly
      const drawerId = state.pictionaryDrawerId!;
      state.winner = drawerId;

      // Find drawer username
      const sockets = await io.in(rc).fetchSockets();
      const drawerSocket = sockets.find((s) => s.data.userId === drawerId);
      const drawerName = drawerSocket?.data.username ?? "the drawer";

      io.to(rc).emit("pictionary:winner", {
        userId: drawerId,
        username: drawerName,
        guess,
        prompt: state.pictionaryPrompt,
      });

      try {
        await pointsService.awardPoints(drawerId, POINTS.pictionary_win, "pictionary_win");
      } catch (err) {
        console.error("Points award failed:", err);
      }
    }
  );

  socket.on("pictionary:time_up", ({ roomCode: rc }: { roomCode: string }) => {
    const state = roomGameState.get(rc);
    if (!state || state.winner) return;
    io.to(rc).emit("pictionary:time_up");
  });
}
