"use client";

type Props = {
  submitting: boolean;
  mode: "create" | "edit";
};

export default function SubmitSection({ submitting, mode }: Props) {
  const label = submitting
    ? mode === "create"
      ? "Creating..."
      : "Updating..."
    : mode === "create"
    ? "Create Ticket"
    : "Save Changes";

  return (
    <div className="flex items-center justify-end border-t border-zinc-200 pt-5">
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
        {label}
      </button>
    </div>
  );
}
