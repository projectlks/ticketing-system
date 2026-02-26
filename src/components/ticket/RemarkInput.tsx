"use client";

type Props = {
  value: string;
  error?: string;
  visible: boolean;
  onChange: (v: string) => void;
};

export default function RemarkInput({
  value,
  error,
  visible,
  onChange,
}: Props) {
  if (!visible) return null;

  return (
    <section className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <label className="block text-sm font-medium text-zinc-700">
        Priority Change Remark <span className="text-red-500">*</span>
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Explain why priority changed"
        className={`w-full resize-none rounded-lg border bg-white p-2.5 text-sm text-zinc-900 outline-none ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
