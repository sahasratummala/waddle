import { Link } from "react-router-dom";
import { Bird, Users, CheckSquare, Sparkles, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import GooseAvatar from "@/components/goose/GooseAvatar";
import { GooseStage } from "@waddle/shared";

const FEATURES = [
  {
    icon: CheckSquare,
    title: "AI Daily Tasks",
    description: "Describe your day and Gemini builds a smart task list with points and self-care breaks.",
    colorIcon: "text-avocado",
    colorBg: "bg-avocado/10",
    to: "/daily-tasks",
  },
  {
    icon: Users,
    title: "Flock Party",
    description: "Study alongside friends in real-time rooms with shared timers and mini-games.",
    colorIcon: "text-ocean",
    colorBg: "bg-ocean/10",
    to: "/flock-party",
  },
  {
    icon: Sparkles,
    title: "Grow Your Goose",
    description: "Earn points, evolve your goose from egg to full grown, and unlock accessories.",
    colorIcon: "text-avocado",
    colorBg: "bg-avocado/10",
    to: undefined,
  },
];

const STAGES: GooseStage[] = [GooseStage.EGG, GooseStage.HATCHLING, GooseStage.GOSLING, GooseStage.GOOSE];

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-avocado/15 border-2 border-avocado/30">
            <Bird className="w-5 h-5 text-avocado" />
          </div>
          <span className="font-display text-xl font-black text-forest">Waddle</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"><Button variant="ghost" size="sm" className="font-bold text-forest">Sign In</Button></Link>
          <Link to="/register"><Button variant="primary" size="sm" className="rounded-xl font-black">Get Started</Button></Link>
        </div>
      </header>

      <section className="flex flex-col items-center text-center px-6 pt-12 pb-20 max-w-5xl mx-auto">
        <div className="flex items-end gap-4 mb-10 animate-in">
          {STAGES.map((stage, i) => (
            <div key={stage} className="animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
              <GooseAvatar stage={stage} size={i === 3 ? "lg" : i === 2 ? "md" : i === 1 ? "sm" : "xs"} />
            </div>
          ))}
        </div>

        <h1 className="font-display text-5xl sm:text-7xl font-black text-forest leading-tight mb-5">
          Study together.{" "}
          <span className="gradient-text">Grow your goose.</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed text-forest/60 font-medium">
          Waddle turns your study sessions into a cozy, gamified adventure. Hatch an egg,
          raise a goose, and study alongside your flock.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/register">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />} className="rounded-2xl font-black">
              Hatch your goose, it's free
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="rounded-2xl font-bold border-2 border-forest/20 text-forest hover:bg-white">
              I already have a flock
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-forest/30 font-medium">No credit card required.</p>
      </section>

      <section className="px-6 pb-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, colorIcon, colorBg, to }) => {
            const inner = (
              <>
                <div className={`inline-flex p-3 rounded-2xl ${colorBg} mb-4`}>
                  <Icon className={`w-6 h-6 ${colorIcon}`} />
                </div>
                <h3 className="font-display text-lg font-black text-forest mb-2">{title}</h3>
                <p className="text-sm leading-relaxed text-forest/55 font-medium">{description}</p>
              </>
            );
            return to ? (
              <Link key={title} to={to} className="card p-6 hover:shadow-card-hover transition-all block">
                {inner}
              </Link>
            ) : (
              <div key={title} className="card p-6 hover:shadow-card-hover transition-all">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 pb-20 max-w-7xl mx-auto">
        <div className="card p-8 sm:p-12 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-black text-forest mb-3">Every point counts</h2>
          <p className="mb-10 text-base max-w-xl mx-auto text-forest/55 font-medium">
            Complete tasks and study sessions to earn points. Watch your goose evolve from a tiny egg into a full grown goose.
          </p>
          <div className="flex items-end justify-center gap-6 sm:gap-12">
            {STAGES.map((stage, i) => {
              const labels = ["Egg\n0 pts", "Hatchling\n100 pts", "Gosling\n300 pts", "Goose\n700 pts"];
              return (
                <div key={stage} className="flex flex-col items-center gap-3">
                  <GooseAvatar stage={stage} size={i === 3 ? "xl" : i === 2 ? "lg" : i === 1 ? "md" : "sm"} animated={i === 3} />
                  <div className="text-center">
                    {labels[i].split("\n").map((line, j) => (
                      <p key={j} className={j === 0 ? "font-display font-black text-forest text-sm" : "text-xs text-forest/45 font-medium"}>{line}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-28 text-center max-w-2xl mx-auto">
        <h2 className="font-display text-3xl font-black text-forest mb-4">Ready to start waddling?</h2>
        <p className="mb-8 text-forest/55 font-medium">Join your flock. Study smarter. Grow together.</p>
        <Link to="/register">
          <Button size="lg" variant="primary" fullWidth rightIcon={<ArrowRight className="w-5 h-5" />} className="rounded-2xl font-black">
            Create your free account
          </Button>
        </Link>
      </section>

      <footer className="py-6 text-center text-sm text-forest/30 font-medium border-t-2 border-forest/8">
        <p>2025 Waddle. Made with love and honks.</p>
      </footer>
    </div>
  );
}