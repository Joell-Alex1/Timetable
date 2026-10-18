/**
 * Subject colours — the single source of truth.
 *
 * Six earth tones, but deliberately spread across the hue circle (green,
 * amber, red-brown, blue, purple, teal) rather than six shades of one
 * family. Six near-identical sages would be impossible to tell apart in a
 * dense grid, and worse for anyone with a colour-vision deficiency.
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
  { bg: '#D9E2CE', border: '#C4CDB5', text: '#2F4432', bar: '#44603F' }, // sage
  { bg: '#EFE0C6', border: '#DDC9A6', text: '#6B4F23', bar: '#8A6730' }, // oat
  { bg: '#E8D5C7', border: '#D6BCA8', text: '#6B4435', bar: '#8A5942' }, // clay
  { bg: '#D3DCE2', border: '#B8C6CF', text: '#2F4654', bar: '#3F5D6E' }, // slate
  { bg: '#E2D4DC', border: '#CFBAC6', text: '#5A3A4A', bar: '#744C5F' }, // mauve
  { bg: '#CFE0DC', border: '#B2CCC6', text: '#2A4A46', bar: '#38615C' }, // teal
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
