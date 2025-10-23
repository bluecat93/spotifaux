type Props = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({
  title = "Nothing here yet",
  description = "Try a different search term.",
  action,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-white/5 p-6 text-slate-300 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-slate-400 mt-1">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
