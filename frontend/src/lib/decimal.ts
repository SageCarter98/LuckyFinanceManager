/**
 * The backend serializes Pydantic `Decimal` fields as JSON strings (e.g. "949.75"),
 * not numbers, to avoid float rounding. Every resource module normalizes those
 * fields through this helper immediately after the request so the rest of the
 * app can just do arithmetic on real numbers.
 */
export function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : Number(value)
}

export function parseNullableDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return typeof value === 'number' ? value : Number(value)
}
