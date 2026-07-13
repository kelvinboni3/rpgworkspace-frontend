/**
 * Formats a date-only value (e.g. a session's date) as pt-BR without
 * shifting by the viewer's local timezone. Values that carry real
 * time-of-day information (createdAt/updatedAt) should use
 * `toLocaleDateString` directly instead.
 */
export function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function daysSince(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
