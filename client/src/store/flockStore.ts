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
  isConnected: boolean;
  loading: boolean;
  error: string | null;

  createRoom: (studyConfig: StudyConfig) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<void>;
  leaveRoom: () => void;
  startStudy: (studyConfig: StudyConfig) => void;
  sendMessage: (content: string) => void;
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
  isConnected: false,
  loading: false,
  error: null,

  createRoom: async (studyConfig: StudyConfig) => {
    set({ loading: true, error: null });

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");

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
      set({ loading: false, error: err.error });
      throw new Error(err.error);
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
  },

  joinRoom: async (roomCode: string) => {
    set({ loading: true, error: null });

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");

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
      set({ loading: false, error: err.error });
      throw new Error(err.error);
    }

    const { data } = await res.json();
    set({ room: data.room, loading: false });

    const socket = connectSocket(token);
    socket.emit("join-room", {
      roomCode,
      userId: session.data.session!.user.id,
    });

    get().setupSocketListeners();
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
      set({ timerState });
    });

    socket.on("break-start", (timerState: TimerState) => {
      set({ timerState });
    });

    socket.on("study-complete", () => {
      set((state) => ({
        room: state.room ? { ...state.room, status: RoomStatus.ENDED } : null,
        timerState: DEFAULT_TIMER,
      }));
    });

    socket.on("game-start", ({ gameType, gameData }: { gameType: GameType; gameData: unknown }) => {
      set({ currentGame: gameType, gameData });
    });

    socket.on("game-end", () => {
      set({ currentGame: null, gameData: null });
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
