/**
 * Shared helpers for webhook parser/context/article modules.
 */

export function normalizeTicketId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function normalizeRequiredText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function firstNonEmptyText(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = normalizeOptionalText(value);
    if (normalized) return normalized;
  }
  return null;
}

export function getRawText(raw: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!raw) return null;
  for (const key of keys) {
    const value = raw[key];
    const normalized = normalizeOptionalText(value);
    if (normalized) return normalized;
  }
  return null;
}

export function normalizeScalarText(value: unknown): string | null {
  if (typeof value === "string") return normalizeOptionalText(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * Get value by exact key or dotted path (example: event.id).
 */
export function getPathValue(source: Record<string, unknown> | null, path: string): unknown {
  if (!source) return undefined;
  if (Object.prototype.hasOwnProperty.call(source, path)) return source[path];
  if (!path.includes(".")) return source[path];

  const segments = path.split(".");
  let current: unknown = source;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function getPathText(source: Record<string, unknown> | null, ...paths: string[]): string | null {
  if (!source) return null;
  for (const path of paths) {
    const normalized = normalizeScalarText(getPathValue(source, path));
    if (normalized) return normalized;
  }
  return null;
}
