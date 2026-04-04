import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Bird, LayoutDashboard, CheckSquare, Users, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { clsx } from "clsx";

const NAV_LINKS = [
  { to: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { to: "/daily-tasks", label: "Daily Tasks",  icon: CheckSquare },
  { to: "/flock-party", label: "Flock Party",  icon: Users },
  { to: "/shop",        label: "Shop",         icon: ShoppingBag },
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
    <nav
      className="sticky top-0 z-40 w-full backdrop-blur-md border-b"
      style={{ backgroundColor: "rgba(40,44,21,0.88)", borderColor: "rgba(229,222,202,0.1)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(137,132,51,0.2)", border: "2px solid rgba(137,132,51,0.5)" }}
            >
              <Bird className="w-5 h-5 text-avocado" />
            </div>
            <span className="font-display text-xl font-extrabold text-cream tracking-tight">
              Waddle
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "text-avocado"
                      : "text-cream/60 hover:text-cream hover:bg-cream/8"
                  )
                }
                style={({ isActive }) =>
                  isActive ? { backgroundColor: "rgba(137,132,51,0.15)" } : {}
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* User + sign out */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "rgba(229,222,202,0.06)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(137,132,51,0.3)", border: "1px solid rgba(137,132,51,0.5)" }}
                  >
                    <span className="text-avocado text-xs font-bold">
                      {user.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-cream text-sm font-medium leading-none">
                      {user.username}
                    </span>
                    <span className="text-ocean text-xs leading-none mt-0.5">
                      {user.pointsAvailable.toLocaleString()} pts
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-cream/40 hover:text-cream hover:bg-cream/10 transition-colors"
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
            className="md:hidden p-2 rounded-lg text-cream/60 hover:text-cream hover:bg-cream/10 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 pb-4 pt-2"
          style={{ backgroundColor: "#282C15", borderColor: "rgba(229,222,202,0.1)" }}
        >
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
                      ? "text-avocado"
                      : "text-cream/60 hover:text-cream hover:bg-cream/8"
                  )
                }
                style={({ isActive }) =>
                  isActive ? { backgroundColor: "rgba(137,132,51,0.15)" } : {}
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}

            {user && (
              <div
                className="mt-2 pt-2 border-t flex items-center justify-between"
                style={{ borderColor: "rgba(229,222,202,0.1)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(137,132,51,0.3)", border: "1px solid rgba(137,132,51,0.5)" }}
                  >
                    <span className="text-avocado text-xs font-bold">
                      {user.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-cream text-sm font-medium">{user.username}</p>
                    <p className="text-ocean text-xs">{user.pointsAvailable.toLocaleString()} pts</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-cream/40 hover:text-cream hover:bg-cream/10 transition-colors"
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
