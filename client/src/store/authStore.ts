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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  supabaseUser: null,
  session: null,
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true });

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      set({
        session,
        supabaseUser: session.user,
        user: profile,
        loading: false,
      });
    } else {
      set({ session: null, supabaseUser: null, user: null, loading: false });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ session, supabaseUser: session.user, user: profile });
      } else if (event === "SIGNED_OUT") {
        set({ session: null, supabaseUser: null, user: null });
      } else if (event === "TOKEN_REFRESHED" && session) {
        set({ session });
      }
    });
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }

    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id);
      set({
        session: data.session,
        supabaseUser: data.session.user,
        user: profile,
        loading: false,
      });
    }
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }

    // Profile is created by a Supabase trigger on auth.users insert.
    // If session is immediate (email confirmation disabled), fetch profile.
    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id);
      set({
        session: data.session,
        supabaseUser: data.session.user,
        user: profile,
        loading: false,
      });
    } else {
      // Email confirmation required — user needs to verify
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, supabaseUser: null, session: null, loading: false });
  },

  clearError: () => set({ error: null }),
}));
