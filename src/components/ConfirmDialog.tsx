"use client";

import { useEffect } from "react";
import { ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  contextLabel?: string;
  tone?: "danger" | "neutral";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  details = [],
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  contextLabel,
  tone = "neutral",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const accentText = tone === "danger" ? "text-red-700" : "text-zinc-600";
  const iconRing =
    tone === "danger"
      ? "border-red-200 text-red-600"
      : "border-zinc-200 text-zinc-500";
  const iconBg = tone === "danger" ? "bg-red-50" : "bg-white";
  const confirmButtonClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-zinc-900 hover:bg-zinc-800 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_50px_-25px_rgba(15,23,42,0.35)]"
      >
        <div className="relative px-6 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border ${iconRing} ${iconBg}`}
            >
              {tone === "danger" ? (
                <ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <InformationCircleIcon className="h-6 w-6" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {contextLabel && (
                <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accentText}`}>
                  {contextLabel}
                </span>
              )}
              <h3
                id="confirm-dialog-title"
                className="mt-1 text-lg font-semibold tracking-tight text-zinc-900"
              >
                {title}
              </h3>
              {description && (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>

        <footer className="relative px-6 pb-6">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClass}`}
            >
              {isLoading ? "Processing..." : confirmLabel}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
