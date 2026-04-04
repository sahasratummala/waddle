import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useGooseStore } from "@/store/gooseStore";
import { GooseStage } from "@waddle/shared";

const STAGE_IMAGES: Record<GooseStage, string> = {
  [GooseStage.EGG]: "/goose/egg.png",
  [GooseStage.HATCHLING]: "/goose/hatchling.png",
  [GooseStage.GOSLING]: "/goose/gosling.png",
  [GooseStage.GOOSE]: "/goose/goose.png",
};

export default function Navbar() {
  const { user, signOut } = useAuthStore();
  const { goose } = useGooseStore();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const stage = goose?.stage ?? GooseStage.EGG;

  return (
    <nav className="sticky top-0 z-40 w-full bg-cream border-b-2 border-forest/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: hatchling logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-cream flex items-center justify-center">
              <img
                src="/goose/hatchling.png"
                alt="Waddle"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-display text-xl font-black text-forest">Waddle</span>
          </Link>

          {/* Right: user's current goose stage + accessories + points */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white shadow-card">
                <div className="relative w-9 h-9 shrink-0">
                  <img
                    src={STAGE_IMAGES[stage]}
                    alt={stage}
                    className="w-full h-full object-contain"
                  />
                  {goose?.accessories && goose.accessories.length > 0 && (
                    <div className="absolute inset-0">
                      {goose.accessories.map((ea) =>
                        ea.accessory?.imageUrl ? (
                          <img
                            key={ea.accessoryId}
                            src={ea.accessory.imageUrl}
                            alt={ea.accessory.name}
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-forest text-sm font-bold leading-none">{user.username}</span>
                  <span className="text-avocado text-xs font-semibold leading-none mt-0.5">{user.pointsAvailable.toLocaleString()} pts</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl text-forest/40 hover:text-forest hover:bg-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}