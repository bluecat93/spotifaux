import type { Track } from "../types";
import TrackCard from "./TrackCard";
import EmptyState from "./EmptyState";

type Props = {
  tracks: Track[];
  register?: (id: string | number, el: HTMLAudioElement | null) => void;
  layout?: "list" | "grid";
  emptyMessage?: string;
  onAddToPlaylist?: (id: number | string) => void;
};

export default function TrackList({
  tracks,
  register,
  layout = "list",
  emptyMessage = "No tracks found.",
  onAddToPlaylist,
}: Props) {
  if (!tracks?.length) {
    return <EmptyState title="No Results" description={emptyMessage} />;
  }

  const wrapperClass =
    layout === "grid"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : "flex flex-col gap-4";

  return (
    <div className={wrapperClass}>
      {tracks.map((t) => (
        <TrackCard
          key={t.id}
          track={t}
          register={register}
          onAddToPlaylist={onAddToPlaylist}
        />
      ))}
    </div>
  );
}
