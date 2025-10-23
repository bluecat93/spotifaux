import { useEffect, useRef, useState, useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import AuthPage from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import TrackDetails from "./components/TrackDetails";
import SearchBar from "./components/SearchBar";
import TrackList from "./components/TrackList";
import PlaylistFilter from "./components/PlaylistFilter";
import ErrorBanner from "./components/ErrorBanner";
import Spinner from "./components/Spinner";
import { useAuth } from "./context/AuthContext";
import AddToPlaylistModal from "./components/AddToPlaylistModal";
import { API_BASE, getJSON, postJSON, putJSON, deleteJSON } from "./lib/api";

// --- Local types
type Track = {
  id: number | string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  preview: string;
};

type Playlist = {
  id: number;
  name: string;
  tracks: Array<number | { id: number | string }>;
};

// --- Hooks
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useSingleAudio() {
  const audios = useRef<Map<string | number, HTMLAudioElement>>(new Map());
  const register = (id: string | number, el: HTMLAudioElement | null) => {
    if (!el) {
      audios.current.delete(id);
      return;
    }
    audios.current.set(id, el);
    el.addEventListener("play", () => {
      for (const [otherId, a] of audios.current.entries()) {
        if (otherId !== id && !a.paused) a.pause();
      }
    });
  };
  return { register };
}

export default function App() {
  const { user } = useAuth();

  // tracks & search
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 350);

  // playlists (from backend) + selection
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [plLoading, setPlLoading] = useState(false);
  const [plError, setPlError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null
  );

  // add/remove modal
  const [modalTrackId, setModalTrackId] = useState<number | string | null>(
    null
  );

  const { register } = useSingleAudio();

  // --- Tracks fetch
  const fetchTracks = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data =
        q && q.trim()
          ? await getJSON<Track[]>(`/search?q=${encodeURIComponent(q.trim())}`)
          : await getJSON<Track[]>("/tracks");
      setTracks(data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load tracks");
    } finally {
      setLoading(false);
    }
  };

  // --- Playlists fetch
  const fetchPlaylists = async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }
    setPlLoading(true);
    setPlError(null);
    try {
      const data = await getJSON<Playlist[]>("/playlists");
      setPlaylists(data);
    } catch (e: any) {
      console.error(e);
      setPlError(e?.message || "Failed to load playlists");
    } finally {
      setPlLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks(debouncedQuery);
  }, [debouncedQuery]);

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  // --- Helpers
  const playlistIds = (pl?: Playlist | null) => {
    if (!pl) return new Set<number>();
    return new Set(
      (pl.tracks || []).map((t: any) =>
        typeof t === "number" ? t : Number(t.id)
      )
    );
  };

  // --- Client-side filter (search ∩ selected playlist)
  const shownTracks = useMemo(() => {
    if (selectedPlaylistId == null) return tracks;
    const pl = playlists.find((p) => p.id === selectedPlaylistId);
    if (!pl) return tracks;
    const ids = playlistIds(pl);
    return tracks.filter((t) => ids.has(Number(t.id)));
  }, [tracks, playlists, selectedPlaylistId]);

  // --- Playlist CRUD handlers
  const handleCreatePlaylist = async (name: string) => {
    const created = await postJSON<Playlist>("/playlists", {
      name,
      tracks: [],
    });
    setPlaylists((prev) => [created, ...prev]);
    setSelectedPlaylistId(created.id);
  };

  const handleRenamePlaylist = async (id: number, newName: string) => {
    const pl = playlists.find((p) => p.id === id);
    if (!pl) return;
    const tracksIds = (pl.tracks || []).map((t: any) =>
      typeof t === "number" ? t : Number(t.id)
    );
    const updated = await putJSON<Playlist>(`/playlists/${id}`, {
      name: newName,
      tracks: tracksIds,
    });
    setPlaylists((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleDeletePlaylist = async (id: number) => {
    await deleteJSON(`/playlists/${id}`);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-slate-100">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/login" element={<AuthPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-6">
                    <div>
                      {plError && (
                        <div className="mb-3 text-xs text-red-300">
                          {plError}
                        </div>
                      )}
                      <PlaylistFilter
                        playlists={playlists}
                        selectedId={selectedPlaylistId}
                        onSelect={setSelectedPlaylistId}
                        onCreate={handleCreatePlaylist}
                        onRename={handleRenamePlaylist}
                        onDelete={handleDeletePlaylist}
                      />
                      {plLoading && (
                        <div className="mt-2 text-xs text-slate-400">
                          Loading playlists…
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-6 flex items-center justify-center">
                        <SearchBar
                          value={query}
                          onChange={setQuery}
                          onSubmit={() => fetchTracks(query)}
                          placeholder="Search by title or artist…"
                        />
                      </div>

                      {error && <ErrorBanner message={error} />}
                      {loading && <Spinner />}

                      {!loading && !error && (
                        <>
                          <TrackList
                            tracks={shownTracks}
                            register={register}
                            layout="list"
                            onAddToPlaylist={(id) => setModalTrackId(id)}
                          />

                          {modalTrackId !== null && (
                            <AddToPlaylistModal
                              trackId={modalTrackId}
                              onClose={() => setModalTrackId(null)}
                              onUpdate={fetchPlaylists}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              </ProtectedRoute>
            }
          />

          <Route
            path="/track/:id"
            element={
              <ProtectedRoute>
                <TrackDetails />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <footer className="mt-12 border-t border-slate-800 bg-black/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-slate-400">
          <p>
            Spotifaux frontend connected to <code>spotifaux-backend</code> at{" "}
            <code>{API_BASE}</code>.
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>
              Implements: catalog, search, preview (via &lt;audio&gt;), auth,
              playlists.
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
