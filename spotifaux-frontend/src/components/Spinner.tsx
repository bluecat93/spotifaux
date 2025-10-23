export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-8" aria-busy="true" aria-live="polite">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <span className="ml-3 text-sm text-slate-400">Loading…</span>
    </div>
  );
}
