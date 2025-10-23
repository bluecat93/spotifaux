import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { CirclePlus, CircleCheck } from "lucide-react";
import { getJSON, postJSON, putJSON } from "../lib/api";

type Playlist = {
  id: number;
  user_id: number;
  name: string;
  tracks: Array<{ id: number | string } | number>;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  trackId: number | string;
  onClose: () => void;
  onUpdate?: () => void;
};

export default function AddToPlaylistModal({
  trackId,
  onClose,
  onUpdate,
}: Props) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const trackNum = Number(trackId);

  function isMember(pl: Playlist): boolean {
    return (pl.tracks || [])
      .map((t: any) => (typeof t === "number" ? t : Number(t.id)))
      .includes(trackNum);
  }

  function handleClose() {
    onUpdate?.();
    onClose();
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!user) {
          if (mounted) setPlaylists([]);
        } else {
          const data = await getJSON<Playlist[]>("/playlists");
          if (mounted) setPlaylists(data);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load playlists");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await postJSON<Playlist>("/playlists", {
        name: newName.trim(),
        tracks: [],
      });
      setPlaylists((prev) => [created, ...prev]);
      setNewName("");
      onUpdate?.();
    } catch (e: any) {
      setError(e?.message || "Failed to create playlist");
    } finally {
      setCreating(false);
    }
  }

  async function toggleMembership(pl: Playlist) {
    if (pending[pl.id]) return;
    setPending((p) => ({ ...p, [pl.id]: true }));
    setError(null);

    const ids = new Set(
      (pl.tracks || []).map((t: any) =>
        typeof t === "number" ? t : Number(t.id)
      )
    );
    const currentlyIn = ids.has(trackNum);

    if (currentlyIn) {
      ids.delete(trackNum);
    } else {
      ids.add(trackNum);
    }

    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === pl.id ? { ...p, tracks: Array.from(ids) as any[] } : p
      )
    );

    try {
      const updated = await putJSON<Playlist>(`/playlists/${pl.id}`, {
        name: pl.name,
        tracks: Array.from(ids),
      });
      setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? updated : p)));
      onUpdate?.();
    } catch (e: any) {
      setError(e?.message || "Failed to update playlist");
      setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? pl : p)));
    } finally {
      setPending((p) => ({ ...p, [pl.id]: false }));
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,520px)] rounded-2xl border border-white/10 bg-[#161616] p-5 shadow-xl">
        <h2 className="text-xl font-semibold">Add / Remove from Playlists</h2>
        <p className="text-sm text-slate-400 mt-1">
          Click a playlist to add or remove this track. Create new ones below.
        </p>

        <div className="mt-4 flex w-full items-stretch gap-2">
          <input
            className="w-0 flex-1 min-w-0 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 outline-none text-slate-100 placeholder:text-slate-500"
            placeholder="New playlist name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="shrink-0 rounded-xl px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>

        <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-white/10 bg-white/5">
          {loading ? (
            <div className="p-4 text-sm text-slate-400">Loading playlists…</div>
          ) : playlists.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">
              No playlists yet. Create one above.
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {playlists.map((pl) => {
                const member = isMember(pl);
                const isBusy = !!pending[pl.id];
                return (
                  <li
                    key={pl.id}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      member ? "bg-[#1DB954]/80 text-black" : "hover:bg-white/5"
                    }`}
                    onClick={() => toggleMembership(pl)}
                  >
                    <div className="min-w-0">
                      <div
                        className={`font-medium truncate ${
                          member ? "text-black" : ""
                        }`}
                      >
                        {pl.name}
                      </div>
                      <div
                        className={`text-xs ${
                          member ? "text-black/70" : "text-slate-400"
                        }`}
                      >
                        {Array.isArray(pl.tracks) ? pl.tracks.length : 0} tracks
                      </div>
                    </div>

                    <button
                      className={`p-1 hover:text-white transition-colors ${
                        member ? "text-black font-semibold" : "text-slate-200"
                      } ${isBusy ? "opacity-60 cursor-wait" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMembership(pl);
                      }}
                      disabled={isBusy}
                      title={
                        member
                          ? "Remove from this playlist"
                          : "Add to this playlist"
                      }
                    >
                      {isBusy ? "…" : member ? <CircleCheck /> : <CirclePlus />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-800 bg-red-900/30 text-red-200 p-2 text-sm">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleClose}
            className="rounded-xl px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
