'use client'

import { SUBJECT_PALETTES, hashSubject } from '../lib/palette'

/**
 * The tilted session chips scattered around the timetable preview.
 *
 * Each one is a real scheduled session pulled from the timetable, not sample
 * copy — so the decoration is also a second, closer look at the output. They
 * are hidden below `xl` (there is no margin for them on narrower screens)
 * and marked aria-hidden, since the same sessions are already announced by
 * the preview grid itself.
 */

/** Pick a few sessions spread across different days, for visual variety. */
function pickSessions(timetable, count) {
  if (!timetable) return []
  const perDay = []
  for (const [day, slots] of Object.entries(timetable)) {
    for (const [time, entries] of Object.entries(slots)) {
      if (entries?.length) {
        perDay.push({ ...entries[0], day, time })
        break // one per day keeps the chips from repeating a single subject
      }
    }
  }
  return perDay.slice(0, count)
}

// Pushed mostly outside the preview so they frame it rather than cover it —
// a chip sitting over the grid hides the very thing it is advertising.
// Shown from `xl` only: below that there is no margin to sit in.
const POSITIONS = [
  'left-0 top-24 -translate-x-[88%] -rotate-[8deg]',
  'right-0 top-28 translate-x-[88%] rotate-[7deg]',
  'left-0 bottom-12 -translate-x-[82%] rotate-[5deg]',
  'right-0 bottom-8 translate-x-[85%] -rotate-[6deg]',
]

export default function FloatingSessionCards({ timetable }) {
  const sessions = pickSessions(timetable, POSITIONS.length)
  if (sessions.length === 0) return null

  return (
    <div aria-hidden="true">
      {sessions.map((s, i) => {
        const tone = SUBJECT_PALETTES[hashSubject(s.subject)]
        return (
          <div
            key={`${s.subject}-${s.day}-${s.time}`}
            className={`absolute hidden w-44 rounded-xl p-3 shadow-card-hover xl:block ${POSITIONS[i]}`}
            style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
          >
            <div
              className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg text-2xs font-700"
              style={{ background: tone.bar, color: '#fff' }}
            >
              {s.type === 'Lab' ? 'L' : 'T'}
            </div>
            <p
              className="truncate text-2xs font-700 leading-tight"
              style={{ color: tone.text }}
            >
              {s.subject}
            </p>
            <p className="mt-0.5 font-mono text-2xs text-text-muted">
              {s.day.slice(0, 3)} {s.time} · {s.room}
            </p>
          </div>
        )
      })}
    </div>
  )
}
