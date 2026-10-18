'use client'

import { SUBJECT_PALETTES, hashSubject } from '../lib/palette'

/**
 * A scaled-down but real rendering of the generated timetable.
 *
 * Shows the actual product rather than an illustration of it: every block
 * below is a real session, coloured by the same palette the full Timetable
 * page uses, so the preview and the page it previews are visibly the same
 * artefact. The hero claims the scheduler produces a clash-free week — this
 * is the evidence sitting directly beneath the claim.
 */
export default function WeekPreview({ timetable, days = [], slots = [] }) {
  const gridDays = (days.length ? days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).slice(0, 5)
  const gridSlots = (slots.length ? slots : ['9:00', '10:00', '11:00', '12:00', '13:00']).slice(0, 5)

  const entryAt = (day, slot) => timetable?.[day]?.[slot]?.[0] ?? null

  return (
    <div className="overflow-hidden rounded-xl border border-border-base bg-bg-1 shadow-card">
      {/* Panel header, mirroring the Timetable page */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-base px-5 py-4">
        <div className="text-left">
          <p className="text-sm font-700 text-text-primary">Weekly timetable</p>
          <p className="text-2xs text-text-muted">
            {timetable
              ? 'Every session placed without a clash'
              : 'Generate a schedule to fill this in'}
          </p>
        </div>
        <span className="rounded-full border border-border-base bg-bg-3 px-3 py-1 text-2xs text-text-secondary">
          {gridDays.length} days · {slots.length || gridSlots.length} hours
        </span>
      </div>

      {/* The grid itself */}
      <div className="overflow-x-auto p-3 sm:p-4">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className="w-12" />
              {gridDays.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="px-1 pb-2 text-center text-2xs font-700 uppercase tracking-wide text-text-secondary"
                >
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridSlots.map((slot) => (
              <tr key={slot}>
                <th
                  scope="row"
                  className="pr-2 text-right align-top font-mono text-2xs font-500 text-text-muted"
                >
                  {slot}
                </th>
                {gridDays.map((day) => {
                  const entry = entryAt(day, slot)
                  const tone = entry ? SUBJECT_PALETTES[hashSubject(entry.subject)] : null
                  return (
                    <td key={`${day}-${slot}`} className="p-[3px] align-top">
                      {entry ? (
                        <div
                          className="rounded-lg px-2 py-1.5 text-left"
                          style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
                        >
                          <p
                            className="truncate text-2xs font-600 leading-tight"
                            style={{ color: tone.text }}
                          >
                            {entry.subject}
                          </p>
                          <p className="truncate font-mono text-2xs text-text-muted">
                            {entry.room}
                          </p>
                        </div>
                      ) : (
                        <div className="h-[34px] rounded-lg border border-dashed border-border-base" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
