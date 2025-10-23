import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

type Track = {
  id: number | string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  preview: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json();
}

export default function TrackDetails() {
  const { id } = useParams<{ id: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await getJSON<Track[]>("/tracks");
        const found = all.find((t) => String(t.id) === String(id)) || null;
        setTrack(found);
        if (!found) setErr("Track not found");
      } catch (e: any) {
        setErr(e?.message || "Failed to load track");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="text-slate-400">Loading…</div>;
  }

  if (err) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-900/30 text-red-200 p-3">
        {err}
      </div>
    );
  }

  if (!track) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-sm text-slate-400 hover:underline">
        ← Back
      </Link>

      <div className="mt-4 rounded-2xl p-6 bg-white/5 border border-white/10">
        <h1 className="text-2xl font-semibold">{track.title}</h1>
        <p className="text-slate-300 mt-1">
          {track.artist}
          {track.album ? ` · ${track.album}` : ""}
        </p>

        {typeof track.duration === "number" && (
          <p className="text-slate-400 text-sm mt-1">
            {Math.floor(track.duration / 60)}:
            {String(track.duration % 60).padStart(2, "0")} min
          </p>
        )}

        <div className="mt-4">
          <audio
            controls
            className="w-full"
            src={track.preview}
            preload="metadata"
          />
        </div>
      </div>
    </div>
  );
}
