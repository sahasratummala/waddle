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
          <CheckCircle
            className={`w-3.5 h-3.5 ${pass ? "text-accent" : "text-white/20"}`}
          />
          <span className={pass ? "text-white/60" : "text-white/30"}>{label}</span>
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
      // If session was created immediately, navigate to dashboard
      const { user } = useAuthStore.getState();
      if (user) {
        navigate("/dashboard");
      } else {
        // Email confirmation required
        setEmailSent(true);
      }
    } catch {
      // error is in the store
    }
  }

  const displayError = localError || error;

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-white mb-3">
            Check your email!
          </h1>
          <p className="text-white/55 text-sm mb-6">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
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
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 group mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
              <Bird className="w-6 h-6 text-primary" />
            </div>
          </Link>
          <h1 className="text-2xl font-display font-extrabold text-white">Hatch your egg</h1>
          <p className="text-white/50 text-sm mt-1">Create your free Waddle account</p>
        </div>

        <div className="bg-background-light border border-white/10 rounded-2xl p-7 shadow-xl shadow-black/30">
          {displayError && (
            <div className="flex items-start gap-2.5 p-3 mb-5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
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
              <label className="block text-sm font-medium text-white/70 mb-1.5">
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
              <label className="block text-sm font-medium text-white/70 mb-1.5">
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
                  className="absolute inset-y-0 right-3 flex items-center text-white/40 hover:text-white/80 transition-colors"
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

          <p className="text-center text-xs text-white/30 mt-4">
            By creating an account, you agree to our Terms and Privacy Policy.
          </p>

          <p className="text-center text-sm text-white/40 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          <Link to="/" className="hover:text-white/40 transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
