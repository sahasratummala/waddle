import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Users, Gamepad2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGooseStore } from "@/store/gooseStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import TaskList from "@/components/tasks/TaskList";
import { GooseStage, NEXT_STAGE } from "@waddle/shared";

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
  const { goose, fetchGoose, getEvolutionProgress, subscribeToGoose } = useGooseStore();

  useEffect(() => {
    if (user?.id) {
      fetchGoose(user.id);
      // Subscribe to realtime goose updates (stage, accessories, evolution_points)
      const unsubscribe = subscribeToGoose(user.id);
      return unsubscribe;
    }
  }, [user?.id, fetchGoose, subscribeToGoose]);

  const stage = goose?.stage ?? GooseStage.EGG;
  const nextStage = NEXT_STAGE[stage];
  // Evolution progress is now based on goose.evolutionPoints, not user.pointsTotal
  const progress = getEvolutionProgress();

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-1 flex flex-col gap-3">

          {/* Hero card */}
          <div className="card p-6 flex flex-col items-center text-center gap-4">
            <div>
              <p className="text-forest/50 text-sm font-medium">{getTodayMessage()}</p>
              <h1 className="font-display text-2xl font-black text-forest">{user?.username}!</h1>
            </div>

            <GooseAvatar stage={stage} accessories={goose?.accessories} size="xl" animated />

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
                <p className="text-xs text-forest/40 mt-1.5 font-medium">
                  Feed your goose in the Shop to evolve it!
                </p>
              </div>
            ) : (
              <p className="text-sm font-bold text-avocado">Maximum evolution! 🪿</p>
            )}
          </div>

          {/* Nav icons */}
          <div className="grid grid-cols-3 gap-3">
            <Link
              to="/shop"
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white/40"
              style={{ background: "#898433" }}
            >
              <ShoppingBag className="w-7 h-7 text-white" />
              <span className="text-xs font-bold text-white">Shop</span>
            </Link>
            <Link
              to="/flock-party"
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white/40"
              style={{ background: "#7E9DA2" }}
            >
              <Users className="w-7 h-7 text-white" />
              <span className="text-xs font-bold text-white">Flock</span>
            </Link>
            <Link
              to="/games"
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-2 border-white/40"
              style={{ background: "#45441A" }}
            >
              <Gamepad2 className="w-7 h-7 text-white" />
              <span className="text-xs font-bold text-white">Games</span>
            </Link>
          </div>
        </div>

        {/* RIGHT: Tasks */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-black text-forest">Today's Tasks</h2>
                <p className="text-forest/50 text-sm font-medium">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("waddle:add-tasks"))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "#898433" }}
              >
                + Add Tasks
              </button>
            </div>
            <TaskList compact hideFloatingButton />
          </div>
        </div>

      </div>
    </div>
  );
}