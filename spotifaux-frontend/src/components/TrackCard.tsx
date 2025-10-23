import { memo } from "react";
import { Link } from "react-router-dom";

export type Track = {
  id: number | string;
  title: string;
  artist: string;
  album?: string;
  duration?: number; // seconds
  preview: string; // URL to mp3
};

type Props = {
  track: Track;
  /** Optional: pass your register function so only one <audio> plays at a time */
  register?: (id: string | number, el: HTMLAudioElement | null) => void;
  /** Callback to open AddToPlaylist modal */
  onAddToPlaylist?: (id: number | string) => void;
};

function secondsToMMSS(s?: number) {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const TrackCard = memo(({ track, register, onAddToPlaylist }: Props) => {
  return (
    <div className="rounded-2xl shadow p-4 bg-white/5 backdrop-blur border border-white/10 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/track/${track.id}`} className="hover:underline">
            <h3 className="text-lg font-semibold leading-tight">
              {track.title}
            </h3>
          </Link>

          <button
            className="mt-2 text-sm rounded-lg border border-slate-700 px-3 py-1 hover:bg-white/5"
            onClick={() => onAddToPlaylist?.(track.id)}
          >
            Add / Remove
          </button>

          <p className="text-sm text-gray-300 mt-1">
            {track.artist}
            {track.album ? ` · ${track.album}` : ""}
          </p>
          {typeof track.duration === "number" && (
            <p className="mt-1 text-xs text-gray-400">
              {secondsToMMSS(track.duration)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <audio
          ref={(el) => register?.(track.id, el)}
          controls
          className="w-full"
          src={track.preview}
          preload="metadata"
        />
      </div>
    </div>
  );
});

TrackCard.displayName = "TrackCard";
export default TrackCard;
