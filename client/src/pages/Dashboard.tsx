import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, Users, TrendingUp, Star, ArrowRight, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGooseStore } from "@/store/gooseStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { GooseStage, NEXT_STAGE, GOOSE_EVOLUTION_THRESHOLDS } from "@waddle/shared";

const STAGE_NAMES: Record<GooseStage, string> = {
  [GooseStage.EGG]: "Egg",
  [GooseStage.HATCHLING]: "Hatchling",
  [GooseStage.GOSLING]: "Gosling",
  [GooseStage.GOOSE]: "Goose",
};

const STAGE_MESSAGES: Record<GooseStage, string> = {
  [GooseStage.EGG]: "Your goose egg is warming up. Complete tasks to hatch it!",
  [GooseStage.HATCHLING]: "A fluffy hatchling! Keep studying to help it grow.",
  [GooseStage.GOSLING]: "Looking good! Your gosling is almost a full goose.",
  [GooseStage.GOOSE]: "A magnificent goose! You've made it to the top. Keep honking!",
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const { goose, fetchGoose, getEvolutionProgress } = useGooseStore();

  useEffect(() => {
    if (user?.id) {
      fetchGoose(user.id);
    }
  }, [user?.id, fetchGoose]);

  const stage = goose?.stage ?? GooseStage.EGG;
  const progress = user ? getEvolutionProgress(user.pointsTotal) : { current: 0, needed: 100, percentage: 0 };
  const nextStage = NEXT_STAGE[stage];

  return (
    <div className="flex flex-col gap-6 animate-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-background-card to-background-surface border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Goose */}
          <div className="shrink-0">
            <GooseAvatar
              stage={stage}
              accessories={goose?.accessories}
              size="lg"
              animated
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-1">
              Hey, {user?.username}! 👋
            </h1>
            <p className="text-white/55 mb-4">{STAGE_MESSAGES[stage]}</p>

            {/* Stage badge */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-medium">
                <Star className="w-3.5 h-3.5" />
                {STAGE_NAMES[stage]}
              </span>
              <span className="text-white/40 text-sm">
                {user?.pointsTotal.toLocaleString()} total points earned
              </span>
            </div>

            {/* Evolution progress */}
            {nextStage && (
              <div className="mt-4 max-w-sm">
                <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
                  <span>Evolution progress</span>
                  <span>
                    {progress.current}/{progress.needed} pts to {STAGE_NAMES[nextStage]}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-yellow-300 rounded-full transition-all duration-500"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-white/35 mt-1">{progress.percentage}% complete</p>
              </div>
            )}
            {!nextStage && (
              <p className="mt-3 text-sm text-primary font-medium">
                Maximum evolution reached! You're a legend.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Points Available",
            value: user?.pointsAvailable.toLocaleString() ?? "0",
            icon: Zap,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Total Points",
            value: user?.pointsTotal.toLocaleString() ?? "0",
            icon: TrendingUp,
            color: "text-secondary",
            bg: "bg-secondary/10",
          },
          {
            label: "Accessories",
            value: goose?.accessories.length.toString() ?? "0",
            icon: Star,
            color: "text-accent",
            bg: "bg-accent/10",
          },
          {
            label: "Goose Stage",
            value: STAGE_NAMES[stage],
            icon: Star,
            color: "text-white",
            bg: "bg-white/10",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} variant="glass" padding="md">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-display font-extrabold text-white">{value}</p>
            <p className="text-xs text-white/45 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="default" padding="lg" hoverable>
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-white/55 text-sm mb-4">
              Generate your daily task list with AI and track your progress with photo verification.
            </p>
            <Link to="/daily-tasks">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View Daily Tasks
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card variant="default" padding="lg" hoverable>
          <CardHeader>
            <CardTitle>Flock Party</CardTitle>
            <div className="p-2 rounded-lg bg-secondary/10">
              <Users className="w-5 h-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-white/55 text-sm mb-4">
              Study alongside your friends in a real-time room. Shared timers, leaderboards, and break games.
            </p>
            <Link to="/flock-party">
              <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Join a Flock
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
