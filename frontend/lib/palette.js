/**
 * Subject colours — the single source of truth.
 *
 * This table was previously copied into TimetableGrid, FloorMap and
 * SubjectCard, each with a comment saying it matched the others. One copy
 * means they cannot drift apart, and a subject keeps the same colour wherever
 * it appears (Gestalt similarity; Shneiderman 1, consistency).
 *
 * Soft tinted fills with a dark, high-contrast label — the pattern used by
 * calendar apps for event blocks. Every `text` value clears WCAG AA against
 * both its own `bg` (5.9:1 or better) and the white card behind it.
 */
export const SUBJECT_PALETTES = [
  { bg: '#D6E2F3', border: '#B8CDEA', text: '#1E3A8A', bar: '#2461DB' }, // blue
  { bg: '#D1E5DB', border: '#AFD3C2', text: '#14532D', bar: '#15803D' }, // green
  { bg: '#F5E6CC', border: '#E6D0A8', text: '#78350F', bar: '#B45309' }, // amber
  { bg: '#EED9E4', border: '#DEBFD1', text: '#9D174D', bar: '#BE185D' }, // pink
  { bg: '#E2D7EF', border: '#CBB9E2', text: '#5B21B6', bar: '#7C3AED' }, // purple
  { bg: '#CFE6E6', border: '#A9D2D2', text: '#134E4A', bar: '#0F766E' }, // teal
]

/**
 * Stable colour for a subject name.
 * Deterministic, so the same subject keeps its colour across reloads and
 * across every view that renders it.
 */
export function hashSubject(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % SUBJECT_PALETTES.length
}
