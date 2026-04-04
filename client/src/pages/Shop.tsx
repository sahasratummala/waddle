import { useEffect, useState } from "react";
import { ShoppingBag, Zap, Lock, Check, Star, TrendingUp, Utensils } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGooseStore } from "@/store/gooseStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Button from "@/components/ui/Button";
import { GooseStage, GOOSE_EVOLUTION_THRESHOLDS, NEXT_STAGE } from "@waddle/shared";
import type { Accessory, FoodItem } from "@waddle/shared";
import { ACCESSORIES } from "@/data/accessories";
import { FOOD_ITEMS } from "@/data/food";

const STAGE_ORDER: GooseStage[] = [
  GooseStage.EGG,
  GooseStage.HATCHLING,
  GooseStage.GOSLING,
  GooseStage.GOOSE,
];

const STAGE_NAMES: Record<GooseStage, string> = {
  [GooseStage.EGG]: "Egg",
  [GooseStage.HATCHLING]: "Hatchling",
  [GooseStage.GOSLING]: "Gosling",
  [GooseStage.GOOSE]: "Goose",
};

const CATEGORY_LABELS: Record<string, string> = {
  hat: "Hats",
  scarf: "Scarves",
  glasses: "Glasses",
  necklace: "Necklaces",
  bow: "Bows",
  tie: "Ties",
};

type Category = "hat" | "scarf" | "glasses" | "necklace" | "bow" | "tie";
type ShopTab = "food" | "accessories";

export default function Shop() {
  const { user } = useAuthStore();
  const { goose, fetchGoose, equipAccessory, evolve, getEvolutionProgress } = useGooseStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [evolvingLoading, setEvolvingLoading] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, number>>({});

  const stage = goose?.stage ?? GooseStage.EGG;
  const isFullGoose = stage === GooseStage.GOOSE;
  const [activeTab, setActiveTab] = useState<ShopTab>(isFullGoose ? "accessories" : "food");

  useEffect(() => {
    if (user?.id) fetchGoose(user.id);
  }, [user?.id, fetchGoose]);

  useEffect(() => {
    setActiveTab(isFullGoose ? "accessories" : "food");
  }, [isFullGoose]);

  const progress = getEvolutionProgress();
  const nextStage = NEXT_STAGE[stage];
  const canEvolve = nextStage && goose ? goose.evolutionPoints >= GOOSE_EVOLUTION_THRESHOLDS[nextStage] : false;
  const equippedIds = new Set(goose?.accessories.map((a) => a.accessoryId) ?? []);

  const filteredAccessories = selectedCategory === "all"
    ? ACCESSORIES
    : ACCESSORIES.filter((a) => a.category === selectedCategory);

  function isFoodLocked(food: FoodItem) {
    return STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf(food.unlockedAtStage);
  }

  function canAfford(cost: number) {
    return (user?.pointsAvailable ?? 0) >= cost;
  }

  async function handleBuyFood(food: FoodItem) {
    if (isFoodLocked(food) || !canAfford(food.cost)) return;
    setPurchasingId(food.id);
    try {
      const session = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const token = session.data.session?.access_token;
      if (!token) return;
      await fetch("/api/goose/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ foodId: food.id, cost: food.cost, evolutionPoints: food.evolutionPoints }),
      });
      setFeedbackMap((prev) => ({ ...prev, [food.id]: food.evolutionPoints }));
      setTimeout(() => setFeedbackMap((prev) => { const n = { ...prev }; delete n[food.id]; return n; }), 1500);
      await fetchGoose(user!.id);
    } finally {
      setPurchasingId(null);
    }
  }

  async function handleEquip(accessory: Accessory) {
    if (!canAfford(accessory.cost)) return;
    setPurchasingId(accessory.id);
    await equipAccessory(accessory.id);
    setPurchasingId(null);
  }

  async function handleEvolve() {
    setEvolvingLoading(true);
    await evolve();
    setEvolvingLoading(false);
  }

  const categories: Array<"all" | Category> = ["all", "hat", "scarf", "glasses", "necklace", "bow", "tie"];

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-avocado" />
          <h1 className="font-display text-3xl font-black text-forest">Shop</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Goose + evolution */}
          <div className="flex flex-col gap-4">
            <div className="card p-6 flex flex-col items-center text-center gap-4">
              <GooseAvatar stage={stage} accessories={goose?.accessories} size="xl" animated />
              <span className="px-4 py-1.5 rounded-full bg-avocado/10 text-avocado text-sm font-bold border-2 border-avocado/20">
                {STAGE_NAMES[stage]}
              </span>
              <div className="flex gap-2 w-full">
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-avocado/10 border-2 border-avocado/15">
                  <Zap className="w-3.5 h-3.5 text-avocado" />
                  <span className="text-avocado text-sm font-bold">{user?.pointsAvailable.toLocaleString()}</span>
                </div>
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-ocean/10 border-2 border-ocean/15">
                  <TrendingUp className="w-3.5 h-3.5 text-ocean" />
                  <span className="text-ocean text-sm font-bold">{user?.pointsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-forest text-base">Evolution</h2>
                <Star className="w-4 h-4 text-avocado" />
              </div>

              <div className="flex justify-between">
                {STAGE_ORDER.map((s, i) => {
                  const reached = STAGE_ORDER.indexOf(stage) >= i;
                  return (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center ${reached ? "border-avocado bg-avocado/10" : "border-forest/15 bg-white"}`}>
                        <GooseAvatar stage={s} size="xs" />
                      </div>
                      <span className={`text-xs font-bold ${reached ? "text-avocado" : "text-forest/25"}`}>
                        {STAGE_NAMES[s][0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {nextStage && (
                <div>
                  <div className="flex justify-between text-xs font-semibold text-forest/50 mb-1.5">
                    <span>To {STAGE_NAMES[nextStage]}</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden bg-forest/10">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress.percentage}%`, background: "linear-gradient(90deg, #898433, #7E9DA2)" }}
                    />
                  </div>
                  <p className="text-xs text-forest/35 font-medium mt-1">{progress.current}/{progress.needed} pts</p>
                </div>
              )}

              {nextStage && (
                <Button variant="primary" fullWidth size="sm" disabled={!canEvolve} isLoading={evolvingLoading} onClick={handleEvolve}>
                  {canEvolve ? `Evolve to ${STAGE_NAMES[nextStage]}!` : `${progress.needed - progress.current} pts to evolve`}
                </Button>
              )}
              {!nextStage && (
                <p className="text-avocado font-bold text-sm text-center">Maximum evolution!</p>
              )}
            </div>
          </div>

          {/* Right: Shop tabs */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => !isFullGoose && setActiveTab("food")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all ${activeTab === "food" && !isFullGoose
                  ? "bg-avocado text-white border-avocado"
                  : isFullGoose
                    ? "bg-white text-forest/25 border-forest/10 cursor-not-allowed"
                    : "bg-white text-forest/60 border-forest/15 hover:border-avocado/40"
                  }`}
              >
                <Utensils className="w-4 h-4" />
                Feed
                {isFullGoose && <Lock className="w-3 h-3" />}
              </button>

              <button
                onClick={() => isFullGoose && setActiveTab("accessories")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all ${activeTab === "accessories" && isFullGoose
                  ? "bg-avocado text-white border-avocado"
                  : !isFullGoose
                    ? "bg-white text-forest/25 border-forest/10 cursor-not-allowed"
                    : "bg-white text-forest/60 border-forest/15 hover:border-avocado/40"
                  }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Accessories
                {!isFullGoose && (
                  <span className="text-xs bg-ocean/15 text-ocean px-2 py-0.5 rounded-full font-bold">
                    Goose stage
                  </span>
                )}
              </button>
            </div>

            {/* Food grid */}
            {activeTab === "food" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FOOD_ITEMS.map((food) => {
                  const locked = isFoodLocked(food);
                  const affordable = canAfford(food.cost);
                  const purchasing = purchasingId === food.id;
                  const feedback = feedbackMap[food.id];

                  return (
                    <div
                      key={food.id}
                      className={`relative card p-4 flex flex-col items-center gap-3 transition-all ${locked ? "opacity-50" : "hover:shadow-card-hover"
                        }`}
                    >
                      {locked && <Lock className="absolute top-3 right-3 w-3.5 h-3.5 text-forest/30" />}
                      {feedback && (
                        <div className="absolute top-2 left-2 bg-avocado text-white text-xs px-2 py-0.5 rounded-full font-bold animate-bounce">
                          +{feedback}
                        </div>
                      )}

                      <div className="w-full aspect-square rounded-xl bg-cream flex items-center justify-center overflow-hidden p-2">
                        {food.imageUrl
                          ? <img src={food.imageUrl} alt={food.name} className="w-full h-full object-contain" />
                          : <span className="text-3xl">🍞</span>
                        }
                      </div>

                      <p className="font-display font-black text-forest text-sm text-center">{food.name}</p>
                      <p className="text-ocean text-xs font-bold">+{food.evolutionPoints} evolution pts</p>

                      {locked ? (
                        <span className="text-xs text-forest/35 font-semibold">Unlocks at {STAGE_NAMES[food.unlockedAtStage]}</span>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-1 text-avocado text-sm font-black">
                            <Zap className="w-3.5 h-3.5" />{food.cost}
                          </span>
                          <Button
                            variant={affordable ? "primary" : "ghost"}
                            size="sm"
                            className="text-xs py-1 px-3 rounded-xl font-bold"
                            disabled={!affordable || purchasing}
                            isLoading={purchasing}
                            onClick={() => handleBuyFood(food)}
                          >
                            {affordable ? "Feed" : "Need pts"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Accessories grid */}
            {activeTab === "accessories" && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-2xl text-sm font-bold border-2 transition-all capitalize ${selectedCategory === cat
                        ? "bg-avocado text-white border-avocado"
                        : "bg-white text-forest/60 border-forest/10 hover:border-avocado/30"
                        }`}
                    >
                      {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredAccessories.map((accessory) => {
                    const equipped = equippedIds.has(accessory.id);
                    const affordable = canAfford(accessory.cost);
                    const purchasing = purchasingId === accessory.id;

                    return (
                      <div
                        key={accessory.id}
                        className={`relative card p-4 flex flex-col items-center gap-3 transition-all hover:shadow-card-hover ${equipped ? "ring-2 ring-ocean" : ""
                          }`}
                      >
                        {equipped && <Check className="absolute top-3 right-3 w-4 h-4 text-ocean" />}

                        <div className="w-full aspect-square rounded-xl bg-cream flex items-center justify-center overflow-hidden p-2">
                          {accessory.imageUrl
                            ? <img src={accessory.imageUrl} alt={accessory.name} className="w-full h-full object-contain" />
                            : <span className="text-3xl">✨</span>
                          }
                        </div>

                        <p className="font-display font-black text-forest text-sm text-center">{accessory.name}</p>

                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-1 text-avocado text-sm font-black">
                            <Zap className="w-3.5 h-3.5" />{accessory.cost}
                          </span>
                          {equipped ? (
                            <span className="text-xs text-ocean font-bold">Equipped</span>
                          ) : (
                            <Button
                              variant={affordable ? "primary" : "ghost"}
                              size="sm"
                              className="text-xs py-1 px-3 rounded-xl font-bold"
                              disabled={!affordable || purchasing}
                              isLoading={purchasing}
                              onClick={() => handleEquip(accessory)}
                            >
                              {affordable ? "Equip" : "Need pts"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}