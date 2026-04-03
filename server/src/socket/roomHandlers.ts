import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../lib/supabase";
import { getRoomByCode, updateRoomStatus, addParticipantPoints } from "../services/roomService";
import { awardPoints } from "../services/pointsService";
import { RoomStatus } from "@waddle/shared";
import type { TimerState, StudyConfig } from "@waddle/shared";

// Map of roomCode → timer interval IDs
const roomTimers = new Map<string, ReturnType<typeof setInterval>>();
// Map of roomCode → current timer state
const roomTimerStates = new Map<string, TimerState>();

function clearRoomTimer(roomCode: string) {
  const timer = roomTimers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    roomTimers.delete(roomCode);
  }
}

function startTimer(
  io: Server,
  roomCode: string,
  studyConfig: StudyConfig,
  sessionNumber: number = 1,
  phase: "STUDY" | "BREAK" | "LONG_BREAK" = "STUDY"
) {
  clearRoomTimer(roomCode);

  let durationSeconds: number;
  if (phase === "STUDY") {
    durationSeconds = studyConfig.studyDurationMinutes * 60;
  } else if (phase === "LONG_BREAK") {
    durationSeconds = (studyConfig.longBreakDurationMinutes ?? studyConfig.breakDurationMinutes) * 60;
  } else {
    durationSeconds = studyConfig.breakDurationMinutes * 60;
  }

  const timerState: TimerState = {
    phase,
    secondsRemaining: durationSeconds,
    sessionNumber,
    isRunning: true,
    startedAt: new Date().toISOString(),
  };

  roomTimerStates.set(roomCode, timerState);

  const interval = setInterval(async () => {
    const state = roomTimerStates.get(roomCode);
    if (!state) {
      clearRoomTimer(roomCode);
      return;
    }

    state.secondsRemaining -= 1;

    if (state.secondsRemaining <= 0) {
      clearRoomTimer(roomCode);

      if (state.phase === "STUDY") {
        // Award study session points to all participants
        const room = await getRoomByCode(roomCode);
        if (room) {
          const sessionPoints = Math.floor(studyConfig.studyDurationMinutes * 1.5);
          for (const participant of room.participants) {
            await awardPoints(
              participant.userId,
              sessionPoints,
              `Study session completed in flock ${roomCode}`
            );
            await addParticipantPoints(room.id, participant.userId, sessionPoints);
          }
        }

        // Decide: long break or regular break
        const sessionsBeforeLong = studyConfig.sessionsBeforeLongBreak ?? 4;
        const isLongBreak =
          sessionNumber % sessionsBeforeLong === 0 && !!studyConfig.longBreakDurationMinutes;
        const breakPhase = isLongBreak ? "LONG_BREAK" : "BREAK";

        await updateRoomStatus(roomCode, RoomStatus.BREAK);
        io.to(roomCode).emit("break-start", {
          ...state,
          phase: breakPhase,
          secondsRemaining: 0,
        });

        startTimer(io, roomCode, studyConfig, sessionNumber, breakPhase);
      } else {
        // Break finished → next study session
        const nextSession = state.phase !== "STUDY" ? sessionNumber + 1 : sessionNumber;
        await updateRoomStatus(roomCode, RoomStatus.STUDYING);
        startTimer(io, roomCode, studyConfig, nextSession, "STUDY");
      }

      return;
    }

    roomTimerStates.set(roomCode, state);
    io.to(roomCode).emit("timer-tick", state);
  }, 1000);

  roomTimers.set(roomCode, interval);
}

export function registerRoomHandlers(io: Server, socket: Socket) {
  const userId = (socket as Socket & { userId?: string }).userId;

  // join-room
  socket.on("join-room", async (payload: { roomCode: string; userId?: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;

    socket.join(roomCode);

    const room = await getRoomByCode(roomCode);
    if (!room) return;

    const timerState = roomTimerStates.get(roomCode) ?? {
      phase: "IDLE" as const,
      secondsRemaining: 0,
      sessionNumber: 0,
      isRunning: false,
    };

    // Notify others of join
    const joinedParticipant = room.participants.find((p) => p.userId === userId);
    if (joinedParticipant) {
      socket.to(roomCode).emit("participant-joined", joinedParticipant);
    }

    // Send full state to the joining user
    socket.emit("sync-state", { room, timerState });
  });

  // leave-room
  socket.on("leave-room", async (payload: { roomCode: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !userId) return;

    socket.leave(roomCode);
    io.to(roomCode).emit("participant-left", userId);
  });

  // start-study (host only)
  socket.on(
    "start-study",
    async (payload: { roomCode: string; studyConfig: StudyConfig }) => {
      const roomCode = payload.roomCode?.toUpperCase();
      if (!roomCode || !payload.studyConfig) return;

      const room = await getRoomByCode(roomCode);
      if (!room) return;
      if (room.hostId !== userId) {
        socket.emit("error", { message: "Only the host can start the session." });
        return;
      }

      await updateRoomStatus(roomCode, RoomStatus.STUDYING);

      const initialState: TimerState = {
        phase: "STUDY",
        secondsRemaining: payload.studyConfig.studyDurationMinutes * 60,
        sessionNumber: 1,
        isRunning: true,
        startedAt: new Date().toISOString(),
      };

      io.to(roomCode).emit("sync-state", {
        room: { ...room, status: RoomStatus.STUDYING },
        timerState: initialState,
      });

      startTimer(io, roomCode, payload.studyConfig, 1, "STUDY");
    }
  );

  // study-complete (host manually ends)
  socket.on("study-complete", async (payload: { roomCode: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;

    const room = await getRoomByCode(roomCode);
    if (!room || room.hostId !== userId) return;

    clearRoomTimer(roomCode);
    roomTimerStates.delete(roomCode);
    await updateRoomStatus(roomCode, RoomStatus.ENDED);

    io.to(roomCode).emit("study-complete");
  });

  // sync-state request
  socket.on("request-sync", async (payload: { roomCode: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode) return;

    const room = await getRoomByCode(roomCode);
    const timerState = roomTimerStates.get(roomCode) ?? {
      phase: "IDLE" as const,
      secondsRemaining: 0,
      sessionNumber: 0,
      isRunning: false,
    };

    socket.emit("sync-state", { room, timerState });
  });

  // send-message
  socket.on("send-message", async (payload: { roomCode: string; content: string }) => {
    const roomCode = payload.roomCode?.toUpperCase();
    if (!roomCode || !payload.content?.trim() || !userId) return;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    const message = {
      id: uuidv4(),
      roomCode,
      userId,
      username: profile?.username ?? "Unknown",
      content: payload.content.trim().slice(0, 500),
      type: "CHAT" as const,
      createdAt: new Date().toISOString(),
    };

    io.to(roomCode).emit("new-message", message);
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    // Leave all rooms this socket was in
    socket.rooms.forEach((room) => {
      if (room !== socket.id && userId) {
        io.to(room).emit("participant-left", userId);
      }
    });
  });
}
