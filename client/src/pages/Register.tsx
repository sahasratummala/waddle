import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bird, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains a letter", pass: /[a-zA-Z]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      {checks.map(({ label, pass }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <CheckCircle className="w-3.5 h-3.5" style={{ color: pass ? "#7E9DA2" : "rgba(229,222,202,0.2)" }} />
          <span style={{ color: pass ? "rgba(229,222,202,0.65)" : "rgba(229,222,202,0.3)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Register() {
  const { signUp, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email.trim() || !username.trim() || !password.trim()) {
      setLocalError("Please fill in all fields.");
      return;
    }
    if (username.trim().length < 2) {
      setLocalError("Username must be at least 2 characters.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    try {
      await signUp(email.trim(), password, username.trim());
      const { user } = useAuthStore.getState();
      if (user) {
        navigate("/dashboard");
      } else {
        setEmailSent(true);
      }
    } catch {
      // error in store
    }
  }

  const displayError = localError || error;

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(126,157,162,0.2)", border: "2px solid rgba(126,157,162,0.45)" }}>
            <CheckCircle className="w-8 h-8 text-ocean" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-cream mb-3">Check your email!</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(229,222,202,0.55)" }}>
            We sent a confirmation link to{" "}
            <strong className="text-cream">{email}</strong>.
            Click the link to activate your account and start waddling.
          </p>
          <Link to="/login">
            <Button variant="primary" fullWidth>Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "rgba(137,132,51,0.07)" }} />
        <div className="absolute bottom-0 -left-40 w-80 h-80 rounded-full blur-3xl"
          style={{ background: "rgba(126,157,162,0.06)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 group mb-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
              style={{ background: "rgba(137,132,51,0.18)", border: "2px solid rgba(137,132,51,0.45)" }}>
              <Bird className="w-7 h-7 text-avocado" />
            </div>
          </Link>
          <h1 className="text-2xl font-display font-extrabold text-cream">Hatch your egg</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(229,222,202,0.5)" }}>
            Create your free Waddle account
          </p>
        </div>

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
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="goose_master"
                className="input-base"
                autoComplete="username"
                autoFocus
                required
                minLength={2}
                maxLength={30}
              />
            </div>

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
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(229,222,202,0.7)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center transition-colors"
                  style={{ color: "rgba(229,222,202,0.4)" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={loading}
              size="md"
              className="mt-1"
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: "rgba(229,222,202,0.3)" }}>
            By creating an account, you agree to our Terms and Privacy Policy.
          </p>

          <p className="text-center text-sm mt-4" style={{ color: "rgba(229,222,202,0.4)" }}>
            Already have an account?{" "}
            <Link to="/login" className="text-avocado font-medium hover:text-primary-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-5">
          <Link to="/" style={{ color: "rgba(229,222,202,0.25)" }}
            className="hover:text-cream/50 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
