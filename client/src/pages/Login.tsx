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
      // error in store
    }
  }

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-avocado/15 border-2 border-avocado/30">
              <Bird className="w-7 h-7 text-avocado" />
            </div>
          </Link>
          <h1 className="font-display text-3xl font-black text-forest">Welcome Back</h1>
          <p className="text-sm text-forest/50 font-medium mt-1">Sign in to Waddle</p>
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
              <label className="block text-sm font-bold text-forest mb-1.5">Email</label>
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
              <label className="block text-sm font-bold text-forest mb-1.5">Password</label>
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
                  className="absolute inset-y-0 right-3 flex items-center text-forest/40 hover:text-forest"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="primary" fullWidth isLoading={loading} size="md" className="mt-1 rounded-xl font-black">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm mt-5 text-forest/50 font-medium">
            No account?{" "}
            <Link to="/register" className="text-avocado font-black hover:text-olive transition-colors">
              Create One
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-4">
          <Link to="/" className="text-forest/30 font-medium hover:text-forest/60 transition-colors">Back to Home</Link>
        </p>
      </div>
    </div>
  );
}