import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bird, Eye, EyeOff, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const { signIn, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError("Please fill in all fields.");
      return;
    }

    try {
      await signIn(email.trim(), password);
      navigate("/dashboard");
    } catch {
      // error is set in the store
    }
  }

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "rgba(137,132,51,0.07)" }} />
        <div className="absolute bottom-0 -left-40 w-80 h-80 rounded-full blur-3xl"
          style={{ background: "rgba(126,157,162,0.06)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 group mb-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
              style={{ background: "rgba(137,132,51,0.18)", border: "2px solid rgba(137,132,51,0.45)" }}>
              <Bird className="w-7 h-7 text-avocado" />
            </div>
          </Link>
          <h1 className="text-2xl font-display font-extrabold text-cream">Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(229,222,202,0.5)" }}>
            Sign in to your Waddle account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 shadow-xl shadow-black/40"
          style={{ background: "#45441A", border: "1px solid rgba(229,222,202,0.1)" }}>
          {displayError && (
            <div className="flex items-start gap-2.5 p-3 mb-5 rounded-lg text-sm"
              style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.25)", color: "#E88080" }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(229,222,202,0.7)" }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-base"
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium" style={{ color: "rgba(229,222,202,0.7)" }}>
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-avocado hover:text-primary-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center transition-colors"
                  style={{ color: "rgba(229,222,202,0.4)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(229,222,202,0.85)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(229,222,202,0.4)")}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={loading}
              size="md"
              className="mt-1"
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "rgba(229,222,202,0.4)" }}>
            Don't have an account?{" "}
            <Link to="/register" className="text-avocado font-medium hover:text-primary-300 transition-colors">
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-5">
          <Link to="/" className="transition-colors" style={{ color: "rgba(229,222,202,0.25)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(229,222,202,0.5)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(229,222,202,0.25)")}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
