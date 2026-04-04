import { Link } from "react-router-dom";
import { Bird, Users, CheckSquare, Sparkles, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import GooseAvatar from "@/components/goose/GooseAvatar";
import { GooseStage } from "@waddle/shared";

const FEATURES = [
  {
    icon: CheckSquare,
    title: "AI-Powered Daily Tasks",
    description:
      "Describe your day and let Claude generate a structured task list with point values — including self-care reminders.",
    color: "text-primary",
    bg: "bg-primary/10",
    to: "/register",
  },
  {
    icon: Users,
    title: "Flock Party",
    description:
      "Study alongside friends in real-time rooms with shared Pomodoro timers, leaderboards, and mini-games on breaks.",
    color: "text-secondary",
    bg: "bg-secondary/10",
    to: "/register",
  },
  {
    icon: Sparkles,
    title: "Grow Your Goose",
    description:
      "Complete tasks and study sessions to earn points, evolve your goose from egg to full goose, and unlock accessories.",
    color: "text-accent",
    bg: "bg-accent/10",
    to: "/register",
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
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
            <Bird className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display text-xl font-extrabold text-white">Waddle</span>
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
            <div
              key={stage}
              className="animate-float"
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              <GooseAvatar stage={stage} size={i === 3 ? "lg" : i === 2 ? "md" : i === 1 ? "sm" : "xs"} />
            </div>
          ))}
        </div>

        <h1 className="text-5xl sm:text-7xl font-display font-extrabold text-white leading-tight mb-5">
          Study together.{" "}
          <span className="bg-gradient-to-r from-primary via-yellow-300 to-primary bg-clip-text text-transparent">
            Grow your goose.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mb-10 leading-relaxed">
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

        <p className="mt-5 text-sm text-white/30">No credit card required.</p>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, color, bg, to }) => (
            <Link
              key={title}
              to={to}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:-translate-y-1 transition-all duration-200 block"
            >
              <div className={`inline-flex p-3 rounded-xl ${bg} mb-4`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-2">{title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Evolution strip */}
      <section className="relative z-10 px-6 pb-24 max-w-7xl mx-auto">
        <div className="bg-white/3 border border-white/10 rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white mb-3">
            Every point counts
          </h2>
          <p className="text-white/55 mb-10 text-base max-w-xl mx-auto">
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
                      <p
                        key={j}
                        className={j === 0 ? "text-white font-display font-bold text-sm" : "text-white/50 text-xs"}
                      >
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
        <h2 className="text-3xl font-display font-extrabold text-white mb-4">
          Ready to start waddling?
        </h2>
        <p className="text-white/55 mb-8">
          Join thousands of students who study smarter and grow together.
        </p>
        <Link to="/register">
          <Button size="lg" variant="primary" fullWidth rightIcon={<ArrowRight className="w-5 h-5" />}>
            Create your free account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-white/30 text-sm">
        <p>© {new Date().getFullYear()} Waddle. Made with love and honks.</p>
      </footer>
    </div>
  );
}
