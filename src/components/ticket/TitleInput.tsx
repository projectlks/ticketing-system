"use client";

type Props = {
  value: string;
  error?: string;
  validationState?: "valid" | "invalid";
  showValidation?: boolean;
  disabled?: boolean;
  onChange: (v: string) => void;
  onBlur?: () => void;
};

export default function TitleInput({
  value,
  error,
  validationState,
  showValidation = false,
  disabled = false,
  onChange,
  onBlur,
}: Props) {
  const hasError = Boolean(error);
  const showInvalid = hasError;
  const showValid =
    showValidation && !hasError && validationState === "valid";

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">Title</label>
      <input
        value={value}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Short ticket summary"
        className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-zinc-900 outline-none transition ${
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-500"
            : showInvalid
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : showValid
            ? "border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            : "border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        }`}
      />
      {hasError && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
