/**
 * Formats a date-only value (e.g. a session's date) as pt-BR without
 * shifting by the viewer's local timezone. Values that carry real
 * time-of-day information (createdAt/updatedAt) should use
 * `toLocaleDateString` directly instead.
 */
export function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
