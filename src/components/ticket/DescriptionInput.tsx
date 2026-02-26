"use client";

type Props = {
  value: string;
  error?: string;
  onChange: (v: string) => void;
};

export default function DescriptionInput({ value, error, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">Description</label>
      <textarea
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe issue details, impact, and expected result"
        className={`w-full resize-y rounded-xl border bg-white p-3 text-sm text-zinc-900 outline-none ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
