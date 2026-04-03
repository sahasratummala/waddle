// ─── Enums ───────────────────────────────────────────────────────────────────

export enum GooseStage {
  EGG = "EGG",
  HATCHLING = "HATCHLING",
  GOSLING = "GOSLING",
  GOOSE = "GOOSE",
}

export enum StudyStyle {
  POMODORO = "POMODORO",
  FLOWMODORO = "FLOWMODORO",
  TIME_BLOCKING = "TIME_BLOCKING",
  CUSTOM = "CUSTOM",
}

export enum GameType {
  MAZE = "MAZE",
  BREADCRUMB = "BREADCRUMB",
  PICTIONARY = "PICTIONARY",
}

export enum TaskCategory {
  ACADEMIC = "ACADEMIC",
  WORK = "WORK",
  PERSONAL = "PERSONAL",
  SELF_CARE = "SELF_CARE",
  CREATIVE = "CREATIVE",
  FITNESS = "FITNESS",
  OTHER = "OTHER",
}

export enum RoomStatus {
  LOBBY = "LOBBY",
  STUDYING = "STUDYING",
  BREAK = "BREAK",
  GAME = "GAME",
  ENDED = "ENDED",
}

// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  pointsTotal: number;
  pointsAvailable: number;
  createdAt: string;
}

// ─── Goose ────────────────────────────────────────────────────────────────────

export interface Accessory {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  cost: number;
  category: "hat" | "scarf" | "glasses" | "bag" | "other";
  unlockedAtStage: GooseStage;
}

export interface Goose {
  id: string;
  userId: string;
  stage: GooseStage;
  accessories: EquippedAccessory[];
  createdAt: string;
}

export interface EquippedAccessory {
  accessoryId: string;
  accessory: Accessory;
  equippedAt: string;
}

// ─── Points ───────────────────────────────────────────────────────────────────

export interface Points {
  userId: string;
  total: number;
  available: number;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface DailyTask {
  id: string;
  userId: string;
  date: string; // ISO date string YYYY-MM-DD
  title: string;
  description: string;
  estimatedMinutes: number;
  points: number;
  category: TaskCategory;
  isSelfCare: boolean;
  completed: boolean;
  photoUrl?: string; // photo verification URL
  createdAt: string;
}

export interface TaskGenerationInput {
  description: string;
  date?: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  estimatedMinutes: number;
  points: number;
  category: TaskCategory;
}

export interface TaskGenerationResult {
  tasks: GeneratedTask[];
  selfCare: GeneratedTask[];
}

// ─── Study Config ─────────────────────────────────────────────────────────────

export interface StudyConfig {
  style: StudyStyle;
  studyDurationMinutes: number;
  breakDurationMinutes: number;
  longBreakDurationMinutes?: number;
  sessionsBeforeLongBreak?: number; // Pomodoro-specific
  minimumSessionMinutes?: number;   // Flowmodoro-specific
  blocks?: TimeBlock[];             // Time Blocking-specific
}

export interface TimeBlock {
  label: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

// ─── Flock Party / Room ───────────────────────────────────────────────────────

export interface FlockParty {
  id: string;
  code: string; // 6-char room code
  hostId: string;
  studyStyle: StudyStyle;
  studyConfig: StudyConfig;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
}

export interface Participant {
  userId: string;
  username: string;
  avatarUrl?: string;
  gooseStage: GooseStage;
  pointsEarned: number;
  joinedAt: string;
  isHost: boolean;
  isReady: boolean;
}

// ─── Timer State ──────────────────────────────────────────────────────────────

export interface TimerState {
  phase: "STUDY" | "BREAK" | "LONG_BREAK" | "IDLE";
  secondsRemaining: number;
  sessionNumber: number;
  isRunning: boolean;
  startedAt?: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  roomCode: string;
  userId: string;
  username: string;
  content: string;
  type: "CHAT" | "SYSTEM" | "GAME_EVENT";
  createdAt: string;
}

// ─── Socket Events (shared payloads) ─────────────────────────────────────────

export interface JoinRoomPayload {
  roomCode: string;
  userId: string;
  username: string;
  gooseStage: GooseStage;
}

export interface LeaveRoomPayload {
  roomCode: string;
  userId: string;
}

export interface StartStudyPayload {
  roomCode: string;
  studyConfig: StudyConfig;
}

export interface TimerTickPayload {
  roomCode: string;
  timerState: TimerState;
}

export interface SyncStatePayload {
  room: FlockParty;
  timerState: TimerState;
}

// ─── Game Payloads ────────────────────────────────────────────────────────────

export interface GameStartPayload {
  roomCode: string;
  gameType: GameType;
  gameData?: unknown;
}

export interface MazeMovePayload {
  roomCode: string;
  userId: string;
  direction: "UP" | "DOWN" | "LEFT" | "RIGHT";
  position: { x: number; y: number };
}

export interface MazeCompletePayload {
  roomCode: string;
  userId: string;
  timeSeconds: number;
}

export interface BreadcrumbTapPayload {
  roomCode: string;
  userId: string;
  tappedAt: string;
  score: number;
}

export interface PictionaryDrawPayload {
  roomCode: string;
  userId: string;
  drawData: DrawPoint[];
}

export interface DrawPoint {
  x: number;
  y: number;
  pressure?: number;
  type: "start" | "move" | "end";
}

export interface PictionaryGuessPayload {
  roomCode: string;
  userId: string;
  guess: string;
}

export interface GameEndPayload {
  roomCode: string;
  gameType: GameType;
  results: GameResult[];
}

export interface GameResult {
  userId: string;
  username: string;
  score: number;
  pointsAwarded: number;
}

// ─── API Response types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Goose evolution thresholds ───────────────────────────────────────────────

export const GOOSE_EVOLUTION_THRESHOLDS: Record<GooseStage, number> = {
  [GooseStage.EGG]: 0,
  [GooseStage.HATCHLING]: 100,
  [GooseStage.GOSLING]: 300,
  [GooseStage.GOOSE]: 700,
};

export const NEXT_STAGE: Partial<Record<GooseStage, GooseStage>> = {
  [GooseStage.EGG]: GooseStage.HATCHLING,
  [GooseStage.HATCHLING]: GooseStage.GOSLING,
  [GooseStage.GOSLING]: GooseStage.GOOSE,
};
