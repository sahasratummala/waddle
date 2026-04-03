import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Bird, LayoutDashboard, CheckSquare, Users, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { clsx } from "clsx";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/daily-tasks", label: "Daily Tasks", icon: CheckSquare },
  { to: "/flock-party", label: "Flock Party", icon: Users },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
];

export default function Navbar() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-40 w-full bg-background-light/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 group"
          >
            {/* Goose logo placeholder */}
            <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
              <Bird className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display text-xl font-extrabold text-white tracking-tight">
              Waddle
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side: user info + sign out */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                  <div className="w-7 h-7 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center">
                    <span className="text-primary text-xs font-bold">
                      {user.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium leading-none">
                      {user.username}
                    </span>
                    <span className="text-primary text-xs leading-none mt-0.5">
                      {user.pointsAvailable.toLocaleString()} pts
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-background-light px-4 pb-4 pt-2">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}

            {user && (
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center">
                    <span className="text-primary text-xs font-bold">
                      {user.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user.username}</p>
                    <p className="text-primary text-xs">{user.pointsAvailable.toLocaleString()} pts</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
