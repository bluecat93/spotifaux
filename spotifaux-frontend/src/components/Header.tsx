import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Music2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-black/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#1DB954] text-black grid place-items-center font-bold">
            <Music2 />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Spotifaux</h1>
        </div>

        {/* Right side: API + auth controls */}
        <div className="flex items-center gap-4 md:ml-4">
          <div className="text-xs text-slate-400">API: {API_BASE}</div>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                Hi, {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg px-3 py-1.5 text-sm bg-[#1DB954] text-black font-semibold hover:opacity-90"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
