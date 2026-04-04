import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Users, Gamepad2, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGooseStore } from "@/store/gooseStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import TaskList from "@/components/tasks/TaskList";
import { GooseStage, NEXT_STAGE, GOOSE_EVOLUTION_THRESHOLDS } from "@waddle/shared";

const STAGE_NAMES: Record<GooseStage, string> = {
  [GooseStage.EGG]: "Egg",
  [GooseStage.HATCHLING]: "Hatchling",
  [GooseStage.GOSLING]: "Gosling",
  [GooseStage.GOOSE]: "Goose",
};

const WELCOME_MESSAGES = [
  "Let's get GOosing!",
  "Your flock is waiting.",
  "Time to waddle through today!",
  "Honk honk, let's get it!",
  "Another day, another feather.",
  "Ready to hatch some goals?",
  "Let's make today count!",
];

function getTodayMessage() {
  return WELCOME_MESSAGES[new Date().getDay() % WELCOME_MESSAGES.length];
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { goose, fetchGoose, getEvolutionProgress } = useGooseStore();

  useEffect(() => {
    if (user?.id) fetchGoose(user.id);
  }, [user?.id, fetchGoose]);

  const stage = goose?.stage ?? GooseStage.EGG;
  const nextStage = NEXT_STAGE[stage];
  const progress = user
    ? getEvolutionProgress(user.pointsTotal)
    : { current: 0, needed: 100, percentage: 0 };
  const totalThreshold = GOOSE_EVOLUTION_THRESHOLDS[nextStage ?? GooseStage.GOOSE] ?? 0;

  // silence unused var warning
  void totalThreshold;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Goose hero */}
        <div className="lg:col-span-1 flex flex-col gap-4">

          {/* Hero card */}
          <div className="card p-6 flex flex-col items-center text-center gap-4">
            <div>
              <p className="text-forest/50 text-sm font-medium">{getTodayMessage()}</p>
              <h1 className="font-display text-2xl font-black text-forest">{user?.username}!</h1>
            </div>

            <GooseAvatar
              stage={stage}
              accessories={goose?.accessories}
              size="xl"
              animated
            />

            <span className="inline-block px-4 py-1.5 rounded-full bg-avocado/10 text-avocado text-sm font-bold border-2 border-avocado/20">
              {STAGE_NAMES[stage]}
            </span>

            <div className="flex gap-2 w-full">
              <div className="flex-1 flex flex-col items-center py-2.5 px-3 rounded-xl bg-avocado/10 border-2 border-avocado/15">
                <span className="text-avocado text-xs font-bold uppercase tracking-wide">To Spend</span>
                <span className="text-avocado text-sm font-black">{user?.pointsAvailable.toLocaleString()} pts</span>
              </div>
              <div className="flex-1 flex flex-col items-center py-2.5 px-3 rounded-xl bg-ocean/10 border-2 border-ocean/15">
                <span className="text-ocean text-xs font-bold uppercase tracking-wide">Total Earned</span>
                <span className="text-ocean text-sm font-black">{user?.pointsTotal.toLocaleString()} pts</span>
              </div>
            </div>

            {nextStage ? (
              <div className="w-full">
                <div className="flex justify-between text-xs font-semibold text-forest/50 mb-2">
                  <span>Evolving to {STAGE_NAMES[nextStage]}</span>
                  <span>{progress.percentage}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-forest/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(progress.percentage, 100)}%`,
                      background: "linear-gradient(90deg, #898433, #7E9DA2)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-avocado">Maximum evolution! You are a legend!</p>
            )}
          </div>

          {/* Nav cards */}
          <Link to="/shop" className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-avocado flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-black text-forest text-base">Shop</p>
              <p className="text-forest/50 text-xs font-medium">Feed and accessorize</p>
            </div>
            <ChevronRight className="w-5 h-5 text-forest/30 group-hover:text-avocado transition-colors" />
          </Link>

          <Link to="/flock-party" className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-ocean flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-black text-forest text-base">Flock Party</p>
              <p className="text-forest/50 text-xs font-medium">Study with friends</p>
            </div>
            <ChevronRight className="w-5 h-5 text-forest/30 group-hover:text-ocean transition-colors" />
          </Link>

          <Link to="/games" className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-olive flex items-center justify-center shrink-0">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-black text-forest text-base">Games</p>
              <p className="text-forest/50 text-xs font-medium">Play solo or in a flock</p>
            </div>
            <ChevronRight className="w-5 h-5 text-forest/30 group-hover:text-olive transition-colors" />
          </Link>
        </div>

        {/* RIGHT: Tasks */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="mb-4">
              <h2 className="font-display text-xl font-black text-forest">Today's Tasks</h2>
              <p className="text-forest/50 text-sm font-medium">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <TaskList compact />
          </div>
        </div>

      </div>
    </div>
  );
}