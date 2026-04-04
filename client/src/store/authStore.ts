import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@waddle/shared";

interface AuthState {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email ?? "",
    username: data.username,
    avatarUrl: data.avatar_url,
    pointsTotal: data.points_total ?? 0,
    pointsAvailable: data.points_available ?? 0,
    createdAt: data.created_at,
  };
}

// Hold a reference to the realtime channel so we can clean it up on sign-out
let profileChannel: ReturnType<typeof supabase.channel> | null = null;

function subscribeToProfile(userId: string) {
  // Clean up any existing subscription first
  if (profileChannel) {
    supabase.removeChannel(profileChannel);
    profileChannel = null;
  }

  profileChannel = supabase
    .channel(`profile:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const data = payload.new as Record<string, unknown>;
        useAuthStore.setState((state) => ({
          user: state.user
            ? {
              ...state.user,
              pointsTotal: (data.points_total as number) ?? state.user.pointsTotal,
              pointsAvailable: (data.points_available as number) ?? state.user.pointsAvailable,
            }
            : null,
        }));
      }
    )
    .subscribe();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  supabaseUser: null,
  session: null,
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true });

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      set({ session, supabaseUser: session.user, user: profile, loading: false });
      subscribeToProfile(session.user.id);
    } else {
      set({ session: null, supabaseUser: null, user: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ session, supabaseUser: session.user, user: profile });
        subscribeToProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        if (profileChannel) {
          supabase.removeChannel(profileChannel);
          profileChannel = null;
        }
        set({ session: null, supabaseUser: null, user: null });
      } else if (event === "TOKEN_REFRESHED" && session) {
        set({ session });
      }
    });
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }

    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id);
      set({ session: data.session, supabaseUser: data.session.user, user: profile, loading: false });
      subscribeToProfile(data.session.user.id);
    }
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }

    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id);
      set({ session: data.session, supabaseUser: data.session.user, user: profile, loading: false });
      subscribeToProfile(data.session.user.id);
    } else {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    if (profileChannel) {
      supabase.removeChannel(profileChannel);
      profileChannel = null;
    }
    await supabase.auth.signOut();
    set({ user: null, supabaseUser: null, session: null, loading: false });
  },

  clearError: () => set({ error: null }),

  refreshProfile: async () => {
    const { supabaseUser } = get();
    if (!supabaseUser) return;
    const profile = await fetchProfile(supabaseUser.id);
    if (profile) set({ user: profile });
  },
}));