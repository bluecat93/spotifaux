type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search by title or artist…",
  disabled,
}: Props) {
  return (
    <div className="flex w-full md:max-w-xl gap-3">
      <input
        aria-label="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-700 bg-black/40 text-slate-100 placeholder:text-slate-400 px-4 py-2 outline-none focus:ring-2 focus:ring-[#1DB954]/50 disabled:opacity-60"
      />
    </div>
  );
}
