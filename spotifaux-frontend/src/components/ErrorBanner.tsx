type Props = { message: string };

export default function ErrorBanner({ message }: Props) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-800 bg-red-900/30 text-red-200 p-3"
    >
      {message}
    </div>
  );
}
