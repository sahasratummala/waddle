import { create } from "zustand";
import type { Goose, Accessory, EquippedAccessory } from "@waddle/shared";
import { GooseStage, GOOSE_EVOLUTION_THRESHOLDS, NEXT_STAGE } from "@waddle/shared";
import { supabase } from "@/lib/supabase";

interface GooseState {
  goose: Goose | null;
  availableAccessories: Accessory[];
  loading: boolean;
  error: string | null;

  fetchGoose: (userId: string) => Promise<void>;
  fetchAccessories: () => Promise<void>;
  equipAccessory: (accessoryId: string) => Promise<void>;
  unequipAccessory: (accessoryId: string) => Promise<void>;
  evolve: () => Promise<void>;
  getEvolutionProgress: (pointsTotal: number) => { current: number; needed: number; percentage: number };
}

export const useGooseStore = create<GooseState>((set, get) => ({
  goose: null,
  availableAccessories: [],
  loading: false,
  error: null,

  fetchGoose: async (userId: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("geese")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    if (data) {
      const goose: Goose = {
        id: data.id,
        userId: data.user_id,
        stage: data.stage as GooseStage,
        accessories: (data.accessories as EquippedAccessory[]) ?? [],
        createdAt: data.created_at,
      };
      set({ goose, loading: false });
    }
  },

  fetchAccessories: async () => {
    const { data, error } = await supabase
      .from("accessories")
      .select("*")
      .order("cost", { ascending: true });

    if (!error && data) {
      set({ availableAccessories: data as Accessory[] });
    }
  },

  equipAccessory: async (accessoryId: string) => {
    const { goose } = get();
    if (!goose) return;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    const res = await fetch("/api/goose/accessory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ accessoryId, action: "equip" }),
    });

    if (res.ok) {
      const { data } = await res.json();
      set((state) => ({
        goose: state.goose ? { ...state.goose, accessories: data.accessories } : null,
      }));
    }
  },

  unequipAccessory: async (accessoryId: string) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    const res = await fetch("/api/goose/accessory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ accessoryId, action: "unequip" }),
    });

    if (res.ok) {
      const { data } = await res.json();
      set((state) => ({
        goose: state.goose ? { ...state.goose, accessories: data.accessories } : null,
      }));
    }
  },

  evolve: async () => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    const res = await fetch("/api/goose/evolve", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const { data } = await res.json();
      set((state) => ({
        goose: state.goose ? { ...state.goose, stage: data.stage } : null,
      }));
    }
  },

  getEvolutionProgress: (pointsTotal: number) => {
    const { goose } = get();
    if (!goose) return { current: 0, needed: 100, percentage: 0 };

    const currentStageThreshold = GOOSE_EVOLUTION_THRESHOLDS[goose.stage];
    const nextStage = NEXT_STAGE[goose.stage];

    if (!nextStage) {
      // Already at max stage
      return { current: pointsTotal, needed: pointsTotal, percentage: 100 };
    }

    const nextStageThreshold = GOOSE_EVOLUTION_THRESHOLDS[nextStage];
    const pointsInCurrentStage = pointsTotal - currentStageThreshold;
    const pointsNeededForNextStage = nextStageThreshold - currentStageThreshold;
    const percentage = Math.min(
      100,
      Math.floor((pointsInCurrentStage / pointsNeededForNextStage) * 100)
    );

    return {
      current: pointsInCurrentStage,
      needed: pointsNeededForNextStage,
      percentage,
    };
  },
}));
