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
  getEvolutionProgress: () => { current: number; needed: number; percentage: number };
  subscribeToGoose: (userId: string) => () => void;
}

async function buildEquippedAccessories(raw: { accessoryId: string; equippedAt: string }[]): Promise<EquippedAccessory[]> {
  if (!raw.length) return [];

  const { data } = await supabase
    .from("accessories")
    .select("*")
    .in("id", raw.map((a) => a.accessoryId));

  // Explicitly tell TS this is a Map of strings to Accessories
  const accessoryMap = new Map<string, Accessory>(
    (data ?? []).map((a) => [
      a.id,
      {
        id: a.id,
        name: a.name,
        description: a.description,
        cost: a.cost,
        category: a.category,
        unlockedAtStage: a.unlocked_at_stage,
        imageUrl: a.image_url
      } as Accessory
    ])
  );

  // Tell TS this specifically returns an EquippedAccessory
  return raw.map((ea): EquippedAccessory => ({
    accessoryId: ea.accessoryId,
    equippedAt: ea.equippedAt,
    // Add the "as Accessory" right here so TS stops worrying about undefined
    accessory: accessoryMap.get(ea.accessoryId) as Accessory,
  }));
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
      const rawAccessories = (data.accessories as { accessoryId: string; equippedAt: string }[]) ?? [];
      const accessories = await buildEquippedAccessories(rawAccessories);

      const goose: Goose = {
        id: data.id,
        userId: data.user_id,
        stage: data.stage as GooseStage,
        accessories,
        ownedAccessories: data.owned_accessories ?? [], // <--- ADDED THIS LINE
        evolutionPoints: data.evolution_points ?? 0,
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
      const rawAccessories = (data.accessories as { accessoryId: string; equippedAt: string }[]) ?? [];
      const accessories = await buildEquippedAccessories(rawAccessories);

      // Pulling ownedAccessories from the API response so the UI updates instantly
      const ownedAccessories = data.ownedAccessories ?? get().goose?.ownedAccessories ?? [];

      set((state) => ({
        goose: state.goose ? { ...state.goose, accessories, ownedAccessories } : null,
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
      const rawAccessories = (data.accessories as { accessoryId: string; equippedAt: string }[]) ?? [];
      const accessories = await buildEquippedAccessories(rawAccessories);

      // Pulling ownedAccessories from the API response so the UI updates instantly
      const ownedAccessories = data.ownedAccessories ?? get().goose?.ownedAccessories ?? [];

      set((state) => ({
        goose: state.goose ? { ...state.goose, accessories, ownedAccessories } : null,
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

  subscribeToGoose: (userId: string) => {
    const channel = supabase
      .channel(`goose:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "geese",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const data = payload.new;
          const rawAccessories = (data.accessories as { accessoryId: string; equippedAt: string }[]) ?? [];
          const accessories = await buildEquippedAccessories(rawAccessories);
          set((state) => ({
            goose: state.goose
              ? {
                ...state.goose,
                stage: data.stage as GooseStage,
                accessories,
                ownedAccessories: data.owned_accessories ?? [], // <--- ADDED THIS LINE
                evolutionPoints: data.evolution_points ?? 0,
              }
              : null,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  getEvolutionProgress: () => {
    const { goose } = get();
    if (!goose) return { current: 0, needed: 100, percentage: 0 };

    const pointsTotal = goose.evolutionPoints ?? 0;
    const currentStageThreshold = GOOSE_EVOLUTION_THRESHOLDS[goose.stage];
    const nextStage = NEXT_STAGE[goose.stage];

    if (!nextStage) {
      return { current: pointsTotal, needed: pointsTotal, percentage: 100 };
    }

    const nextStageThreshold = GOOSE_EVOLUTION_THRESHOLDS[nextStage];
    const pointsInCurrentStage = Math.max(0, pointsTotal - currentStageThreshold);
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