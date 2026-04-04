import { Link } from "react-router-dom";
import { Bird, Users, CheckSquare, Sparkles, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import GooseAvatar from "@/components/goose/GooseAvatar";
import { GooseStage } from "@waddle/shared";

const CARD_CLASS = "rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1";
const CARD_STYLE = { background: "rgba(69,68,26,0.5)", border: "1px solid rgba(229,222,202,0.1)" };

const FEATURES = [
  {
    icon: CheckSquare,
    title: "AI-Powered Daily Tasks",
    description:
      "Describe your day and let Gemini generate a structured task list with point values — plus self-care reminders so you don't burn out.",
    colorIcon: "text-avocado",
    colorBg: "bg-avocado/10",
    to: "/daily-tasks",
  },
  {
    icon: Users,
    title: "Flock Party",
    description:
      "Study alongside friends in real-time rooms with shared timers, leaderboards, and mini-games during breaks.",
    colorIcon: "text-ocean",
    colorBg: "bg-ocean/10",
    to: "/flock-party",
  },
  {
    icon: Sparkles,
    title: "Grow Your Goose",
    description:
      "Earn points, evolve your goose from egg to full-grown, and unlock hats, accessories, and more.",
    colorIcon: "text-cream",
    colorBg: "bg-cream/10",
  },
];

const STAGES: GooseStage[] = [
  GooseStage.EGG,
  GooseStage.HATCHLING,
  GooseStage.GOSLING,
  GooseStage.GOOSE,
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(137,132,51,0.06)" }} />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ background: "rgba(126,157,162,0.06)" }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl" style={{ background: "rgba(69,68,26,0.2)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(137,132,51,0.2)", border: "2px solid rgba(137,132,51,0.45)" }}>
            <Bird className="w-5 h-5 text-avocado" />
          </div>
          <span className="font-display text-xl font-extrabold text-cream">Waddle</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 max-w-5xl mx-auto">
        {/* Goose parade */}
        <div className="flex items-end gap-4 mb-10 animate-in">
          {STAGES.map((stage, i) => (
            <div key={stage} className="animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
              <GooseAvatar
                stage={stage}
                size={i === 3 ? "lg" : i === 2 ? "md" : i === 1 ? "sm" : "xs"}
              />
            </div>
          ))}
        </div>

        <h1 className="text-5xl sm:text-7xl font-display font-extrabold text-cream leading-tight mb-5">
          Study together.{" "}
          <span style={{
            background: "linear-gradient(135deg, #898433, #7E9DA2)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Grow your goose.
          </span>
        </h1>

        <p className="text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed" style={{ color: "rgba(229,222,202,0.6)" }}>
          Waddle turns your study sessions into a cozy, gamified adventure. Hatch an egg,
          raise a goose, and study alongside your flock — all while building real habits.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/register">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />}>
              Hatch your goose — it's free
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              I already have a flock
            </Button>
          </Link>
        </div>

        <p className="mt-5 text-sm" style={{ color: "rgba(229,222,202,0.3)" }}>No credit card required.</p>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, colorIcon, colorBg, to }) => {
            const inner = (
              <>
                <div className={`inline-flex p-3 rounded-xl ${colorBg} mb-4`}>
                  <Icon className={`w-6 h-6 ${colorIcon}`} />
                </div>
                <h3 className="text-lg font-display font-bold text-cream mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(229,222,202,0.55)" }}>{description}</p>
              </>
            );
            return to ? (
              <Link key={title} to={to} className={CARD_CLASS} style={CARD_STYLE}>{inner}</Link>
            ) : (
              <div key={title} className={CARD_CLASS} style={CARD_STYLE}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Evolution strip */}
      <section className="relative z-10 px-6 pb-24 max-w-7xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-12 text-center"
          style={{ background: "rgba(69,68,26,0.35)", border: "1px solid rgba(229,222,202,0.08)" }}>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-cream mb-3">
            Every point counts
          </h2>
          <p className="mb-10 text-base max-w-xl mx-auto" style={{ color: "rgba(229,222,202,0.55)" }}>
            Complete tasks, study sessions, and games to earn points. Watch your goose evolve
            from a tiny egg into a majestic honking goose.
          </p>
          <div className="flex items-end justify-center gap-6 sm:gap-12">
            {STAGES.map((stage, i) => {
              const labels = ["Egg\n0 pts", "Hatchling\n100 pts", "Gosling\n300 pts", "Goose\n700 pts"];
              return (
                <div key={stage} className="flex flex-col items-center gap-3">
                  <GooseAvatar
                    stage={stage}
                    size={i === 3 ? "xl" : i === 2 ? "lg" : i === 1 ? "md" : "sm"}
                    animated={i === 3}
                  />
                  <div className="text-center">
                    {labels[i].split("\n").map((line, j) => (
                      <p key={j} className={j === 0 ? "text-cream font-display font-bold text-sm" : "text-xs"} style={j === 1 ? { color: "rgba(229,222,202,0.45)" } : {}}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-32 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-display font-extrabold text-cream mb-4">
          Ready to start waddling?
        </h2>
        <p className="mb-8" style={{ color: "rgba(229,222,202,0.55)" }}>
          Join your flock. Study smarter. Grow together.
        </p>
        <Link to="/register">
          <Button size="lg" variant="primary" fullWidth rightIcon={<ArrowRight className="w-5 h-5" />}>
            Create your free account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-sm"
        style={{ borderTop: "1px solid rgba(229,222,202,0.08)", color: "rgba(229,222,202,0.3)" }}>
        <p>© {new Date().getFullYear()} Waddle. Made with love and honks.</p>
      </footer>
    </div>
  );
}
