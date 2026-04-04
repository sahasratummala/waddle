import { Link } from "react-router-dom";
import { Bird, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import GooseAvatar from "@/components/goose/GooseAvatar";
import { GooseStage } from "@waddle/shared";

const STAGES: GooseStage[] = [GooseStage.EGG, GooseStage.HATCHLING, GooseStage.GOSLING, GooseStage.GOOSE];
const STAGE_LABELS = ["Egg\n0 pts", "Hatchling\n100 pts", "Gosling\n300 pts", "Goose\n700 pts"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream overflow-hidden">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-avocado/15 border-2 border-avocado/30">
            <Bird className="w-5 h-5 text-avocado" />
          </div>
          <span className="font-display text-xl font-black text-forest">Waddle</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/register"
            className="px-4 py-1.5 text-sm font-bold text-forest/70 hover:text-forest rounded-xl transition-colors"
          >
            Get Started
          </Link>
          <Link to="/login">
            <Button variant="primary" size="sm" className="rounded-xl font-black">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-10 pb-20 max-w-3xl mx-auto">

        {/* Evolution row — evenly spaced, bottom-aligned */}
        <div className="w-full flex items-end justify-between mb-8 px-4">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex flex-col items-center gap-2">
              <GooseAvatar
                stage={stage}
                size={i === 3 ? "xl" : i === 2 ? "lg" : i === 1 ? "md" : "sm"}
                animated={false}
              />
              <div className="text-center">
                {STAGE_LABELS[i].split("\n").map((line, j) => (
                  <p key={j} className={j === 0 ? "font-display font-black text-forest text-xs" : "text-xs text-forest/40 font-medium"}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Headline */}
        <div className="mb-4">
          <h1 className="font-display text-5xl sm:text-6xl font-black text-forest leading-tight">
            Study together.
          </h1>
          <h1 className="font-display text-5xl sm:text-6xl font-black leading-tight">
            <span className="gradient-text">Grow your goose.</span>
          </h1>
        </div>

        <p className="text-base sm:text-lg max-w-xl mb-8 leading-relaxed text-forest/55 font-medium">
          Waddle turns your study sessions into a cozy, gamified adventure.
          Hatch an egg, raise a goose, and study alongside your flock.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link to="/register">
            <Button
              size="lg"
              variant="primary"
              rightIcon={<ArrowRight className="w-5 h-5 text-cream" />}
              className="rounded-2xl font-black px-8"
            >
              Get Started
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="rounded-2xl font-bold border-2 border-forest/20 text-forest hover:bg-white">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-5 text-center text-xs text-forest/25 font-medium border-t border-forest/8">
        © 2026 Waddle. Made with love. 🪿
      </footer>
    </div>
  );
}