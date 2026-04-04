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
          <CheckCircle className="w-3.5 h-3.5" style={{ color: pass ? "#7E9DA2" : "rgb(40 44 21 / 0.2)" }} />
          <span className="font-medium" style={{ color: pass ? "#45441A" : "rgb(40 44 21 / 0.35)" }}>{label}</span>
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
      if (user) navigate("/dashboard");
      else setEmailSent(true);
    } catch {
      // error in store
    }
  }

  const displayError = localError || error;

  if (emailSent) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-ocean/15 border-2 border-ocean/30">
            <CheckCircle className="w-8 h-8 text-ocean" />
          </div>
          <h1 className="font-display text-2xl font-black text-forest mb-3">Check your email!</h1>
          <p className="text-sm mb-6 text-forest/55 font-medium">
            We sent a confirmation link to <strong className="text-forest">{email}</strong>. Click it to activate your account.
          </p>
          <Link to="/login">
            <Button variant="primary" fullWidth className="rounded-xl font-black">Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-avocado/15 border-2 border-avocado/30">
              <Bird className="w-7 h-7 text-avocado" />
            </div>
          </Link>
          <h1 className="font-display text-3xl font-black text-forest">Adopt Your Goose</h1>
          <p className="text-sm text-forest/50 font-medium mt-1">Create Your Waddle Account</p>
        </div>

        <div className="card p-7">
          {displayError && (
            <div className="flex items-start gap-2.5 p-3 mb-5 rounded-xl text-sm bg-red-50 border-2 border-red-200 text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-forest mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mothergoose"
                className="input-base"
                autoFocus
                required
                minLength={2}
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-forest mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-forest mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-forest/40 hover:text-forest"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <Button type="submit" variant="primary" fullWidth isLoading={loading} size="md" className="mt-1 rounded-xl font-black">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm mt-5 text-forest/50 font-medium">
            Already have an account?{" "}
            <Link to="/login" className="text-avocado font-black hover:text-olive transition-colors">Sign In</Link>
          </p>
        </div>

        <p className="text-center text-xs mt-4">
          <Link to="/" className="text-forest/30 font-medium hover:text-forest/60 transition-colors">Back to Home</Link>
        </p>
      </div>
    </div>
  );
}