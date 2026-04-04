import { create } from "zustand";
import type {
  FlockParty,
  Participant,
  TimerState,
  StudyConfig,
  Message,
  GameType,
} from "@waddle/shared";
import { RoomStatus } from "@waddle/shared";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import { supabase } from "@/lib/supabase";

interface FlockState {
  room: FlockParty | null;
  timerState: TimerState;
  messages: Message[];
  currentGame: GameType | null;
  gameData: unknown;
  completionData: { totalSessions: number; pointsPerSession: number } | null;
  isConnected: boolean;
  loading: boolean;
  error: string | null;

  createRoom: (studyConfig: StudyConfig) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<void>;
  leaveRoom: () => void;
  startStudy: (studyConfig: StudyConfig) => void;
  sendMessage: (content: string) => void;
  launchGame: (gameType: GameType) => void; // <--- ADDED THIS LINE
  setRoom: (room: FlockParty) => void;
  setTimerState: (timerState: TimerState) => void;
  addMessage: (message: Message) => void;
  setGameData: (gameType: GameType | null, data: unknown) => void;
  setupSocketListeners: () => void;
}

const DEFAULT_TIMER: TimerState = {
  phase: "IDLE",
  secondsRemaining: 0,
  sessionNumber: 0,
  isRunning: false,
};

export const useFlockStore = create<FlockState>((set, get) => ({
  room: null,
  timerState: DEFAULT_TIMER,
  messages: [],
  currentGame: null,
  gameData: null,
  completionData: null,
  isConnected: false,
  loading: false,
  error: null,

  createRoom: async (studyConfig: StudyConfig) => {
    set({ loading: true, error: null });

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated. Please log in.");

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studyConfig }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create room");
      }

      const { data } = await res.json();
      set({ room: data.room, loading: false });

      // Connect socket and join the room
      const socket = connectSocket(token);
      socket.emit("join-room", {
        roomCode: data.room.code,
        userId: session.data.session!.user.id,
      });

      get().setupSocketListeners();

      return data.room.code as string;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  joinRoom: async (roomCode: string) => {
    set({ loading: true, error: null });

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated. Please log in.");

      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomCode }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to join room");
      }

      const { data } = await res.json();
      set({ room: data.room, loading: false });

      const socket = connectSocket(token);
      socket.emit("join-room", {
        roomCode,
        userId: session.data.session!.user.id,
      });

      get().setupSocketListeners();
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  leaveRoom: () => {
    const { room } = get();
    if (room) {
      const socket = getSocket();
      socket.emit("leave-room", { roomCode: room.code });
    }
    disconnectSocket();
    set({
      room: null,
      timerState: DEFAULT_TIMER,
      messages: [],
      currentGame: null,
      gameData: null,
      completionData: null,
      isConnected: false,
    });
  },

  startStudy: (studyConfig: StudyConfig) => {
    const { room } = get();
    if (!room) return;
    const socket = getSocket();
    socket.emit("start-study", { roomCode: room.code, studyConfig });
  },

  sendMessage: (content: string) => {
    const { room } = get();
    if (!room) return;
    const socket = getSocket();
    socket.emit("send-message", { roomCode: room.code, content });
  },

  launchGame: (gameType: GameType) => { // <--- ADDED THIS FUNCTION
    const { room } = get();
    if (!room) return;
    const socket = getSocket();
    socket.emit("start-game", { roomCode: room.code, gameType });
  },

  setRoom: (room: FlockParty) => set({ room }),
  setTimerState: (timerState: TimerState) => set({ timerState }),
  addMessage: (message: Message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setGameData: (gameType: GameType | null, data: unknown) =>
    set({ currentGame: gameType, gameData: data }),

  setupSocketListeners: () => {
    const socket = getSocket();

    socket.on("sync-state", ({ room, timerState }) => {
      set({ room, timerState, isConnected: true });
    });

    socket.on("participant-joined", (participant: Participant) => {
      set((state) => {
        if (!state.room) return {};
        const exists = state.room.participants.some((p) => p.userId === participant.userId);
        if (exists) return {};
        return {
          room: {
            ...state.room,
            participants: [...state.room.participants, participant],
          },
        };
      });
    });

    socket.on("participant-left", (userId: string) => {
      set((state) => {
        if (!state.room) return {};
        return {
          room: {
            ...state.room,
            participants: state.room.participants.filter((p) => p.userId !== userId),
          },
        };
      });
    });

    socket.on("timer-tick", (timerState: TimerState) => {
      set((state) => {
        const updates: Partial<FlockState> = { timerState };
        
        // Ensure room status safely matches the current timer phase so the UI updates
        if (state.room) {
          if (timerState.phase === 'STUDY' && state.room.status !== RoomStatus.STUDYING) {
            updates.room = { ...state.room, status: RoomStatus.STUDYING };
          } else if (timerState.phase === 'BREAK' && state.room.status !== RoomStatus.BREAK) {
            updates.room = { ...state.room, status: RoomStatus.BREAK };
          }
        }
        return updates;
      });
    });

    socket.on("break-start", (timerState: TimerState) => {
      set((state) => ({
        timerState,
        // Crucial fix: Update the room status so the Game Hub triggers!
        room: state.room ? { ...state.room, status: RoomStatus.BREAK } : null,
      }));
    });

    socket.on("game-start", ({ gameType, gameData }: { gameType: GameType; gameData: unknown }) => {
      set({ currentGame: gameType, gameData });
    });

    socket.on("game-end", () => {
      set({ currentGame: null, gameData: null });
    });

    socket.on("study-complete", (data: { totalSessions: number; pointsPerSession: number }) => {
      set((state) => ({
        completionData: data,
        timerState: DEFAULT_TIMER,
        room: state.room ? { ...state.room, status: RoomStatus.ENDED } : null,
      }));
    });

    socket.on("participant-points", ({ userId, pointsEarned }: { userId: string; pointsEarned: number }) => {
      set((state) => {
        if (!state.room) return {};
        return {
          room: {
            ...state.room,
            participants: state.room.participants.map((p) =>
              p.userId === userId ? { ...p, pointsEarned } : p
            ),
          },
        };
      });
    });

    socket.on("new-message", (message: Message) => {
      set((state) => ({ messages: [...state.messages, message] }));
    });

    socket.on("room-config-updated", (config: StudyConfig) => {
      set((state) => ({
        room: state.room
          ? { ...state.room, studyConfig: config, studyStyle: config.style }
          : null,
      }));
    });
  },
}));