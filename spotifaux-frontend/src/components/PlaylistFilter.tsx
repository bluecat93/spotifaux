import { useState } from "react";
import { SquarePen, Trash2 } from "lucide-react";

type PlaylistLite = {
  id: number;
  name: string;
  tracks?: Array<number | { id: number | string }>;
};

export default function PlaylistFilter({
  playlists,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  playlists: PlaylistLite[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCreate?: (name: string) => Promise<void> | void;
  onRename?: (id: number, newName: string) => Promise<void> | void;
  onDelete?: (id: number) => Promise<void> | void;
}) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // inline editing / deleting state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [busy, setBusy] = useState<Record<number, boolean>>({});

  const itemProps = (onClick: () => void) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") onClick();
    },
  });

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !onCreate || creating) return;
    try {
      setCreating(true);
      await onCreate(name);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveRename(id: number) {
    const val = editValue.trim();
    if (!val || !onRename) {
      setEditingId(null);
      return;
    }
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await onRename(id, val);
      setEditingId(null);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function handleConfirmDelete(id: number) {
    if (!onDelete) {
      setConfirmDeleteId(null);
      return;
    }
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await onDelete(id);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
      setConfirmDeleteId(null);
      // if the deleted was selected, parent can clear selection in onDelete impl
    }
  }

  return (
    <aside className="w-full md:w-56 shrink-0">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col gap-3 overflow-hidden">
        <div className="text-sm font-medium text-slate-300">Your Library</div>

        {/* Inline create field */}
        <div className="flex w-full items-stretch gap-2">
          <input
            className="w-0 flex-1 min-w-0 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 outline-none text-slate-100 placeholder:text-slate-500"
            placeholder="New playlist name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="shrink-0 rounded-xl px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60"
            title="Create playlist"
          >
            {creating ? "…" : "Create"}
          </button>
        </div>

        {/* All tracks */}
        <div
          {...itemProps(() => onSelect(null))}
          className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
            selectedId === null
              ? "bg-[#1DB954]/80 text-black font-semibold"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          All tracks
        </div>

        {/* Playlists list */}
        <ul className="mt-1 max-h-[60vh] overflow-auto space-y-1 pr-1">
          {playlists.map((p) => {
            const selected = selectedId === p.id;
            const isBusy = !!busy[p.id];
            const isEditing = editingId === p.id;
            const isConfirmingDelete = confirmDeleteId === p.id;

            return (
              <li
                key={p.id}
                className={`rounded-lg px-2 py-2 text-sm transition-colors ${
                  selected
                    ? "bg-[#1DB954]/80 text-black"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Main clickable area (select playlist) */}
                  <div
                    {...itemProps(() => onSelect(p.id))}
                    className="flex-1 min-w-0 rounded-md px-1 py-1 cursor-pointer"
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        className={`w-full min-w-0 rounded-md border px-2 py-1 outline-none ${
                          selected
                            ? "border-black/30 bg-black/10 text-black"
                            : "border-slate-700 bg-black/40 text-slate-100"
                        }`}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(p.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate ${
                            selected ? "text-black font-semibold" : ""
                          }`}
                        >
                          {p.name}
                        </span>
                        <span
                          className={`text-[11px] ${
                            selected ? "text-black/70" : "text-slate-500"
                          }`}
                        >
                          {Array.isArray(p.tracks) ? p.tracks.length : 0}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isConfirmingDelete ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            disabled={isBusy || !editValue.trim()}
                            onClick={() => handleSaveRename(p.id)}
                            className={`rounded-md px-2 py-1 text-xs border ${
                              selected
                                ? "bg-black/10 border-black/20 text-black"
                                : "bg-slate-800 border-slate-700 text-slate-200"
                            } ${isBusy ? "opacity-60 cursor-wait" : ""}`}
                            title="Save"
                          >
                            Save
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => setEditingId(null)}
                            className={`rounded-md px-2 py-1 text-xs border ${
                              selected
                                ? "bg-black/10 border-black/20 text-black"
                                : "bg-slate-800 border-slate-700 text-slate-200"
                            }`}
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            disabled={isBusy}
                            onClick={() => {
                              setEditingId(p.id);
                              setEditValue(p.name);
                            }}
                            className={`p-1 text-slate-400 hover:text-white transition-colors ${
                              isBusy ? "opacity-50 cursor-wait" : ""
                            }`}
                            title="Rename"
                          >
                            <SquarePen size={16} strokeWidth={1.6} />
                          </button>

                          <button
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(p.id)}
                            className={`p-1 text-slate-400 hover:text-red-400 transition-colors ${
                              isBusy ? "opacity-50 cursor-wait" : ""
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={16} strokeWidth={1.6} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        disabled={isBusy}
                        onClick={() => handleConfirmDelete(p.id)}
                        className="rounded-md px-2 py-1 text-xs border bg-red-700/80 border-red-800 text-white"
                        title="Confirm delete"
                      >
                        Confirm
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md px-2 py-1 text-xs border bg-slate-800 border-slate-700 text-slate-200"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
