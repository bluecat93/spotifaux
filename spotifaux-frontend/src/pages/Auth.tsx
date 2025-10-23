import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as any)?.from ?? "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message?.replace(/\"/g, "") || "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold mb-1 text-center">Spotifaux</h1>
        <p className="text-center text-slate-400 mb-6">
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-black/40 px-4 py-2 outline-none text-slate-100 placeholder:text-slate-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ava Synth"
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-4 py-2 outline-none text-slate-100 placeholder:text-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-4 py-2 outline-none text-slate-100 placeholder:text-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-900/30 text-red-200 p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[#1DB954] text-black font-semibold py-2 disabled:opacity-60"
          >
            {pending ? "Please wait…" : mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-400">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button className="underline" onClick={() => setMode("signup")}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="underline" onClick={() => setMode("login")}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
