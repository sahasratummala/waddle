import { useEffect, useState } from "react";
import { ShoppingBag, Zap, Lock, Check, Star, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGooseStore } from "@/store/gooseStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { GooseStage, GOOSE_EVOLUTION_THRESHOLDS, NEXT_STAGE } from "@waddle/shared";
import type { Accessory } from "@waddle/shared";
import { ACCESSORIES } from "@/data/accessories";

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

const CATEGORY_LABELS = {
  hat: "Hats",
  scarf: "Scarves",
  glasses: "Glasses",
  bag: "Bags",
  other: "Other",
};

type Category = keyof typeof CATEGORY_LABELS;

export default function Shop() {
  const { user } = useAuthStore();
  const { goose, fetchGoose, equipAccessory, evolve, getEvolutionProgress } = useGooseStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [evolvingLoading, setEvolvingLoading] = useState(false);

  useEffect(() => {
    if (user?.id) fetchGoose(user.id);
  }, [user?.id, fetchGoose]);

  const stage = goose?.stage ?? GooseStage.EGG;
  const progress = user ? getEvolutionProgress(user.pointsTotal) : { current: 0, needed: 100, percentage: 0 };
  const nextStage = NEXT_STAGE[stage];
  const canEvolve = nextStage && user
    ? user.pointsTotal >= GOOSE_EVOLUTION_THRESHOLDS[nextStage]
    : false;

  const equippedIds = new Set(goose?.accessories.map((a) => a.accessoryId) ?? []);

  const filteredAccessories =
    selectedCategory === "all"
      ? ACCESSORIES
      : ACCESSORIES.filter((a) => a.category === selectedCategory);

  function isLocked(accessory: Accessory): boolean {
    const stageIdx = STAGE_ORDER.indexOf(stage);
    const reqIdx = STAGE_ORDER.indexOf(accessory.unlockedAtStage);
    return stageIdx < reqIdx;
  }

  function canAfford(accessory: Accessory): boolean {
    return (user?.pointsAvailable ?? 0) >= accessory.cost;
  }

  async function handleEquip(accessory: Accessory) {
    if (isLocked(accessory) || !canAfford(accessory)) return;
    setPurchasingId(accessory.id);
    await equipAccessory(accessory.id);
    setPurchasingId(null);
  }

  async function handleEvolve() {
    setEvolvingLoading(true);
    await evolve();
    setEvolvingLoading(false);
  }

  const categories: Array<"all" | Category> = ["all", "hat", "scarf", "glasses", "bag", "other"];

  return (
    <div className="flex flex-col gap-6 animate-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white mb-1 flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-primary" />
          Goose Shop
        </h1>
        <p className="text-white/55">Spend your points on accessories and evolve your goose.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Goose preview + evolution */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card variant="glass" padding="lg">
            <div className="flex flex-col items-center text-center">
              <GooseAvatar
                stage={stage}
                accessories={goose?.accessories}
                size="xl"
                animated
              />
              <h2 className="mt-4 text-xl font-display font-bold text-white">
                {STAGE_NAMES[stage]}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-primary">
                <Zap className="w-4 h-4" />
                <span className="font-semibold">{user?.pointsAvailable.toLocaleString()} pts available</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-white/40 text-sm">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{user?.pointsTotal.toLocaleString()} total earned</span>
              </div>
            </div>
          </Card>

          {/* Evolution */}
          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle className="text-base">Evolution</CardTitle>
              <Star className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                {STAGE_ORDER.map((s, i) => {
                  const reached = STAGE_ORDER.indexOf(stage) >= i;
                  return (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${reached ? "border-primary bg-primary/20" : "border-white/20"
                        }`}>
                        <GooseAvatar stage={s} size="xs" />
                      </div>
                      <span className={`text-xs ${reached ? "text-primary" : "text-white/30"}`}>
                        {STAGE_NAMES[s][0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {nextStage && (
                <>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                      <span>Progress to {STAGE_NAMES[nextStage]}</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full transition-all duration-500"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/35 mt-1">
                      {progress.current}/{progress.needed} pts
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    fullWidth
                    size="sm"
                    disabled={!canEvolve}
                    isLoading={evolvingLoading}
                    onClick={handleEvolve}
                  >
                    {canEvolve ? `Evolve to ${STAGE_NAMES[nextStage]}!` : `${progress.needed - progress.current} pts to evolve`}
                  </Button>
                </>
              )}
              {!nextStage && (
                <div className="text-center py-2">
                  <p className="text-primary font-medium text-sm">Maximum evolution!</p>
                  <p className="text-white/40 text-xs mt-1">Your goose is fully grown.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Accessories */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${selectedCategory === cat
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-white/5 text-white/55 border border-white/10 hover:border-white/25"
                  }`}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredAccessories.map((accessory) => {
              const locked = isLocked(accessory);
              const equipped = equippedIds.has(accessory.id);
              const affordable = canAfford(accessory);
              const purchasing = purchasingId === accessory.id;

              return (
                <div
                  key={accessory.id}
                  className={`relative flex flex-col p-4 rounded-2xl border transition-all ${equipped
                      ? "border-accent/50 bg-accent/8"
                      : locked
                        ? "border-white/8 bg-white/3 opacity-60"
                        : "border-white/10 bg-background-card hover:border-white/25"
                    }`}
                >
                  {locked && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-3.5 h-3.5 text-white/40" />
                    </div>
                  )}
                  {equipped && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-3.5 h-3.5 text-accent" />
                    </div>
                  )}

                  <div className="w-full aspect-square rounded-xl bg-background-surface mb-3 flex items-center justify-center overflow-hidden p-2">
                    {accessory.imageUrl ? (
                      <img
                        src={accessory.imageUrl}
                        alt={accessory.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl">✨</span>
                    )}
                  </div>

                  <h3 className="text-white font-medium text-sm mb-0.5">{accessory.name}</h3>
                  <p className="text-white/40 text-xs mb-3 flex-1">{accessory.description}</p>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-primary text-sm font-semibold">
                      <Zap className="w-3.5 h-3.5" />
                      {accessory.cost}
                    </span>
                    {locked ? (
                      <span className="text-xs text-white/35">
                        {STAGE_NAMES[accessory.unlockedAtStage]}+
                      </span>
                    ) : equipped ? (
                      <span className="text-xs text-accent font-medium">Equipped</span>
                    ) : (
                      <Button
                        variant={affordable ? "primary" : "ghost"}
                        size="sm"
                        className="text-xs py-1 px-2.5"
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
      </div>
    </div>
  );
}