//import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../lib/supabase";
import type { FlockParty, StudyConfig, Participant } from "@waddle/shared";
import { RoomStatus, StudyStyle, GooseStage } from "@waddle/shared";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omit O/0, I/1 for readability
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function isCodeUnique(code: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("rooms")
    .select("id")
    .eq("code", code)
    .in("status", [RoomStatus.LOBBY, RoomStatus.STUDYING, RoomStatus.BREAK, RoomStatus.GAME])
    .single();
  return !data;
}

async function generateUniqueCode(): Promise<string> {
  let code = generateRoomCode();
  let unique = await isCodeUnique(code);
  let attempts = 0;
  while (!unique && attempts < 10) {
    code = generateRoomCode();
    unique = await isCodeUnique(code);
    attempts++;
  }
  if (!unique) throw new Error("Failed to generate a unique room code. Please try again.");
  return code;
}

export async function createRoom(hostId: string, studyConfig: StudyConfig): Promise<FlockParty> {
  const code = await generateUniqueCode();

  // Get host's profile
  const { data: hostProfile } = await supabaseAdmin
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", hostId)
    .single();

  const { data: hostGoose } = await supabaseAdmin
    .from("geese")
    .select("stage")
    .eq("user_id", hostId)
    .single();

  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      code,
      host_id: hostId,
      study_style: studyConfig.style,
      study_config: studyConfig,
      status: RoomStatus.LOBBY,
    })
    .select()
    .single();

  if (error || !room) {
    throw new Error("Failed to create room: " + (error?.message ?? "unknown error"));
  }

  // Add host as first participant
  await supabaseAdmin.from("room_participants").insert({
    room_id: room.id,
    user_id: hostId,
    points_earned: 0,
  });

  const hostParticipant: Participant = {
    userId: hostId,
    username: hostProfile?.username ?? "Host",
    avatarUrl: hostProfile?.avatar_url,
    gooseStage: (hostGoose?.stage as GooseStage) ?? GooseStage.EGG,
    pointsEarned: 0,
    joinedAt: new Date().toISOString(),
    isHost: true,
    isReady: false,
  };

  return {
    id: room.id,
    code: room.code,
    hostId: room.host_id,
    studyStyle: room.study_style as StudyStyle,
    studyConfig: room.study_config as StudyConfig,
    status: room.status as RoomStatus,
    participants: [hostParticipant],
    createdAt: room.created_at,
  };
}

export async function joinRoom(code: string, userId: string): Promise<FlockParty> {
  // Find the room
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !room) {
    throw new Error("Room not found. Check the code and try again.");
  }

  if (room.status === RoomStatus.ENDED) {
    throw new Error("This room has ended.");
  }

  // Check if already a participant
  const { data: existing } = await supabaseAdmin
    .from("room_participants")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    await supabaseAdmin.from("room_participants").insert({
      room_id: room.id,
      user_id: userId,
      points_earned: 0,
    });
  }

  return getRoomByCode(code) as Promise<FlockParty>;
}

export async function getRoomByCode(code: string): Promise<FlockParty | null> {
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .select("*, room_participants(user_id, points_earned, joined_at)")
    .eq("code", code)
    .single();

  if (error || !room) return null;

  // Fetch participant profiles and geese
  const participantIds: string[] = (room.room_participants ?? []).map(
    (p: { user_id: string }) => p.user_id
  );

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", participantIds);

  const { data: geese } = await supabaseAdmin
    .from("geese")
    .select("user_id, stage")
    .in("user_id", participantIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const gooseMap = new Map((geese ?? []).map((g) => [g.user_id, g]));

  const participants: Participant[] = (room.room_participants ?? []).map(
    (p: { user_id: string; points_earned: number; joined_at: string }) => {
      const profile = profileMap.get(p.user_id);
      const goose = gooseMap.get(p.user_id);
      return {
        userId: p.user_id,
        username: profile?.username ?? "Unknown",
        avatarUrl: profile?.avatar_url,
        gooseStage: (goose?.stage as GooseStage) ?? GooseStage.EGG,
        pointsEarned: p.points_earned ?? 0,
        joinedAt: p.joined_at,
        isHost: p.user_id === room.host_id,
        isReady: false,
      };
    }
  );

  return {
    id: room.id,
    code: room.code,
    hostId: room.host_id,
    studyStyle: room.study_style as StudyStyle,
    studyConfig: room.study_config as StudyConfig,
    status: room.status as RoomStatus,
    participants,
    createdAt: room.created_at,
  };
}

export async function updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
  await supabaseAdmin.from("rooms").update({ status }).eq("id", roomId);
}

export async function addParticipantPoints(
  roomId: string,
  userId: string,
  points: number
): Promise<void> {
  const { data: current } = await supabaseAdmin
    .from("room_participants")
    .select("points_earned")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .single();

  await supabaseAdmin
    .from("room_participants")
    .update({ points_earned: (current?.points_earned ?? 0) + points })
    .eq("room_id", roomId)
    .eq("user_id", userId);
}
