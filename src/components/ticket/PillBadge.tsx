type PillBadgeProps = {
  label: string;
  toneClass: string;
  dotClass: string;
  className?: string;
};

export default function PillBadge({
  label,
  toneClass,
  dotClass,
  className,
}: PillBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass} ${className ?? ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
