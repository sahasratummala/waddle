import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, Users, ArrowRight, Zap, Star } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGooseStore } from "@/store/gooseStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Button from "@/components/ui/Button";
import { GooseStage, NEXT_STAGE, GOOSE_EVOLUTION_THRESHOLDS } from "@waddle/shared";

const STAGE_NAMES: Record<GooseStage, string> = {
  [GooseStage.EGG]: "Egg",
  [GooseStage.HATCHLING]: "Hatchling",
  [GooseStage.GOSLING]: "Gosling",
  [GooseStage.GOOSE]: "Goose",
};

// Cute "welcome back" messages — rotate based on day of week
const WELCOME_MESSAGES = [
  "Let's get GOosing!",
  "Your flock is waiting.",
  "Time to waddle through today!",
  "Honk honk — let's get it!",
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

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto animate-in">

      {/* ── Welcome Banner ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-7 sm:p-10"
        style={{ background: "linear-gradient(135deg, #45441A 0%, #343618 100%)", border: "1px solid rgba(229,222,202,0.1)" }}>
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(137,132,51,0.12) 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-7">
          {/* Goose avatar — placeholder until friend's designs arrive */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <GooseAvatar stage={stage} accessories={goose?.accessories} size="lg" animated />
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(137,132,51,0.2)", color: "#898433", border: "1px solid rgba(137,132,51,0.35)" }}>
              {STAGE_NAMES[stage]}
            </span>
          </div>

          {/* Text content */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium mb-1" style={{ color: "rgba(229,222,202,0.5)" }}>
              Welcome back,
            </p>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-cream leading-tight mb-1">
              {user?.username}!
            </h1>
            <p className="text-lg font-display font-semibold mb-5" style={{ color: "#898433" }}>
              {getTodayMessage()}
            </p>

            {/* Points chips */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "rgba(137,132,51,0.15)", border: "1px solid rgba(137,132,51,0.3)", color: "#898433" }}>
                <Zap className="w-3.5 h-3.5" />
                {user?.pointsAvailable.toLocaleString()} pts available
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "rgba(126,157,162,0.12)", border: "1px solid rgba(126,157,162,0.25)", color: "#7E9DA2" }}>
                <Star className="w-3.5 h-3.5" />
                {user?.pointsTotal.toLocaleString()} total
              </div>
            </div>

            {/* Evolution progress */}
            {nextStage ? (
              <div className="max-w-xs mx-auto sm:mx-0">
                <div className="flex items-center justify-between text-xs mb-1.5"
                  style={{ color: "rgba(229,222,202,0.45)" }}>
                  <span>Evolving to {STAGE_NAMES[nextStage]}</span>
                  <span>{user?.pointsTotal ?? 0} / {totalThreshold} pts</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(229,222,202,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(progress.percentage, 100)}%`,
                      background: "linear-gradient(90deg, #898433, #7E9DA2)",
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: "rgba(229,222,202,0.3)" }}>
                  {progress.percentage}% there
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-avocado">
                Maximum evolution — you're a legend! 🪿
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Tasks */}
        <div className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30"
          style={{ background: "#45441A", border: "1px solid rgba(229,222,202,0.1)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-cream">Daily Tasks</h2>
            <div className="p-2 rounded-lg" style={{ background: "rgba(137,132,51,0.15)" }}>
              <CheckSquare className="w-5 h-5 text-avocado" />
            </div>
          </div>
          <p className="text-sm flex-1" style={{ color: "rgba(229,222,202,0.55)" }}>
            Tell Gemini what you need to get done today and it'll build you a smart task list
            with points and self-care breaks.
          </p>
          <Link to="/daily-tasks">
            <Button variant="primary" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
              View Today's Tasks
            </Button>
          </Link>
        </div>

        {/* Flock Party */}
        <div className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30"
          style={{ background: "#45441A", border: "1px solid rgba(229,222,202,0.1)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-cream">Flock Party</h2>
            <div className="p-2 rounded-lg" style={{ background: "rgba(126,157,162,0.15)" }}>
              <Users className="w-5 h-5 text-ocean" />
            </div>
          </div>
          <p className="text-sm flex-1" style={{ color: "rgba(229,222,202,0.55)" }}>
            Study alongside friends in real-time rooms. Shared timers, leaderboards, and
            mini-games during breaks to keep the flock motivated.
          </p>
          <Link to="/flock-party">
            <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
              Join a Flock
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
