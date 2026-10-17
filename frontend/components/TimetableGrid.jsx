'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { SUBJECT_PALETTES as PALETTES, hashSubject } from '../lib/palette'

// Used only by the loading skeleton, which has no data to size itself from.
const FALLBACK_DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const FALLBACK_SLOTS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

/** 'Wednesday' → 'Wed' — works for day names the app has never seen before. */
function shortDay(day) {
  return day.slice(0, 3)
}

/**
 * Decide the grid axes.
 *
 * Days and time slots are configurable in the database, so the authoritative
 * order comes from /timings. Anything present in the timetable but missing
 * from /timings (e.g. a slot deleted after the schedule was generated) is
 * appended rather than dropped — otherwise those sessions would vanish from
 * the UI with no indication that they exist.
 */
function resolveAxes(timetable, days, slots) {
  const outDays  = [...(days  ?? [])]
  const outSlots = [...(slots ?? [])]

  for (const [day, daySlots] of Object.entries(timetable ?? {})) {
    if (!outDays.includes(day)) outDays.push(day)
    for (const slot of Object.keys(daySlots ?? {})) {
      if (!outSlots.includes(slot)) outSlots.push(slot)
    }
  }

  return { days: outDays, slots: outSlots }
}


/**
 * Build grid[day][slotIndex] = { entries, skipRender }
 * Optionally filter to a specific batch.
 */
function buildGrid(timetable, batchFilter, days, slots) {
  const grid = {}
  for (const day of days) {
    grid[day] = {}
    for (let i = 0; i < slots.length; i++) {
      grid[day][i] = { entries: [], skipRender: new Set() }
    }
  }

  if (!timetable) return grid

  for (const day of days) {
    const dayData = timetable[day]
    if (!dayData) continue
    for (const [slotTime, entries] of Object.entries(dayData)) {
      const slotIndex = slots.indexOf(slotTime)
      if (slotIndex === -1) continue
      for (const entry of entries) {
        if (batchFilter && batchFilter !== 'All' && entry.batch !== batchFilter) continue
        grid[day][slotIndex].entries.push({ ...entry })
      }
    }
  }

  // Mark lab continuation slots (slot N+1 for a lab starting at slot N)
  for (const day of days) {
    for (let i = 0; i < slots.length - 1; i++) {
      for (const entry of grid[day][i].entries) {
        if (entry.type !== 'Lab') continue
        const nextSlot = grid[day][i + 1]
        const contIdx = nextSlot.entries.findIndex(
          (e) => e.room === entry.room && e.subject === entry.subject
        )
        if (contIdx !== -1) {
          nextSlot.skipRender.add(`${entry.subject}::${entry.room}`)
        }
      }
    }
  }

  return grid
}

/** Extract unique batches from the timetable (preserving first-seen order) */
function extractBatches(timetable) {
  if (!timetable) return []
  const seen = new Set()
  const batches = []
  for (const dayData of Object.values(timetable)) {
    for (const entries of Object.values(dayData)) {
      for (const e of entries) {
        if (e.batch && !seen.has(e.batch)) {
          seen.add(e.batch)
          batches.push(e.batch)
        }
      }
    }
  }
  return batches.sort()
}

/**
 * Roving-tabindex keyboard navigation for the grid.
 *
 * `role="grid"` is a promise: assistive technology tells the user the table is
 * arrow-key navigable. Without this hook that promise was false, which is
 * worse than a plain table — it advertises an interaction that does not exist.
 *
 * Exactly one cell is tabbable at a time, so Tab moves past the whole grid in
 * one press rather than through 40 cells, and the arrow keys move within it.
 * Home/End jump to the ends of a row.
 *
 * Cells register themselves by (row, col). Because navigation works off what
 * is actually registered, two-hour labs — which span two rows and render only
 * one cell — are handled without special cases: moving down from a lab simply
 * lands on the next cell that exists in that column.
 */
function useRovingGrid() {
  const cells = useRef(new Map())
  const [activeKey, setActiveKey] = useState(null)

  const register = useCallback((row, col, el) => {
    const key = `${row}:${col}`
    if (el) cells.current.set(key, { row, col, el })
    else cells.current.delete(key)
  }, [])

  /** First cell in reading order — the entry point when nothing is focused. */
  const firstKey = () => {
    let best = null
    for (const c of cells.current.values()) {
      if (!best || c.row < best.row || (c.row === best.row && c.col < best.col)) best = c
    }
    return best ? `${best.row}:${best.col}` : null
  }

  // Claim the entry point once refs have attached.
  //
  // Reading the ref map during render does not work: refs are populated after
  // the render that creates them, so on a fresh mount every cell would compute
  // `isActive === false` and the whole grid would be left with tabindex="-1",
  // unreachable by keyboard. Settling it in an effect costs one extra render
  // and is deterministic.
  // Also re-claims if the previously active cell has gone — switching batch
  // tabs or regenerating replaces the cells, which would otherwise strand
  // `activeKey` on a cell that no longer exists and leave nothing tabbable.
  useEffect(() => {
    if (activeKey === null || !cells.current.has(activeKey)) {
      const k = firstKey()
      if (k && k !== activeKey) setActiveKey(k)
    }
  })

  const isActive = (row, col) => activeKey === `${row}:${col}`

  const focusCell = (cell) => {
    if (!cell) return
    setActiveKey(`${cell.row}:${cell.col}`)
    cell.el?.focus()
  }

  function handleKeyDown(e, row, col) {
    const all = [...cells.current.values()]
    let target = null

    const vertical = (dir) => {
      for (const c of all) {
        if (c.col !== col) continue
        if (dir > 0 ? c.row <= row : c.row >= row) continue
        if (!target || Math.abs(c.row - row) < Math.abs(target.row - row)) target = c
      }
    }

    // Horizontal moves prefer the same row but fall back to the nearest one,
    // since rowspans mean neighbouring columns do not always share a row.
    const horizontal = (dir) => {
      let bestScore = Infinity
      for (const c of all) {
        if (dir > 0 ? c.col <= col : c.col >= col) continue
        const score = Math.abs(c.col - col) * 100 + Math.abs(c.row - row)
        if (score < bestScore) { bestScore = score; target = c }
      }
    }

    switch (e.key) {
      case 'ArrowDown':  vertical(1);  break
      case 'ArrowUp':    vertical(-1); break
      case 'ArrowRight': horizontal(1);  break
      case 'ArrowLeft':  horizontal(-1); break
      case 'Home':
        target = all.filter((c) => c.row === row).sort((a, b) => a.col - b.col)[0]
        break
      case 'End':
        target = all.filter((c) => c.row === row).sort((a, b) => b.col - a.col)[0]
        break
      default:
        return
    }

    if (target) {
      e.preventDefault()   // stop the page scrolling instead
      focusCell(target)
    }
  }

  return { register, isActive, handleKeyDown }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Tooltip({ entry, palette }) {
  return (
    <div
      role="tooltip"
      className="
        absolute bottom-full left-1/2 z-50 mb-2 w-52
        -translate-x-1/2 rounded-lg border border-border-bright
        bg-bg-4 p-3 shadow-lg pointer-events-none animate-fade-in text-left
      "
      style={{ borderColor: palette.border }}
    >
      <p className="font-display text-xs font-700 text-text-primary leading-snug mb-1">
        {entry.subject}
      </p>
      <div className="flex flex-col gap-1">
        {entry.batch && <Row label="Batch" value={entry.batch} />}
        <Row label="Room"  value={entry.room} mono />
        <Row label="Floor" value={`Floor ${entry.floor}`} />
        <Row label="Type"  value={entry.type} />
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-2xs text-text-muted">{label}</span>
      <span className={`text-2xs font-500 text-text-secondary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function SessionCell({ entry, palette, rowSpan = 1, nav, row, col }) {
  const [hovered, setHovered] = useState(false)
  const isLab = entry.type === 'Lab'

  return (
    <td
      rowSpan={rowSpan}
      role="gridcell"
      className="relative p-1 align-top"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div
        ref={(el) => nav?.register(row, col, el)}
        tabIndex={nav ? (nav.isActive(row, col) ? 0 : -1) : 0}
        onKeyDown={(e) => nav?.handleKeyDown(e, row, col)}
        aria-label={`${entry.subject} — ${entry.type} in ${entry.room}, Floor ${entry.floor}`}
        className="
          relative flex h-full min-h-[52px] w-full cursor-default flex-col
          justify-between rounded-lg border p-2
          transition-all duration-150 hover:brightness-110
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
        "
        style={{
          background: palette.bg,
          borderColor: palette.border,
          minHeight: rowSpan > 1 ? '108px' : '52px',
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-2xs font-600 leading-tight" style={{ color: palette.text }}>
            {entry.subject}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-1">
          <span className="font-mono text-2xs text-text-muted">{entry.room}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-2xs font-600 uppercase tracking-wide ${isLab ? 'pill-lab' : 'pill-theory'}`}>
            {isLab ? 'Lab' : 'Th'}
          </span>
        </div>
        <span
          className="mt-0.5 inline-flex w-fit items-center rounded-sm border px-1.5 py-0.5 font-mono text-2xs text-text-muted"
          style={{ borderColor: 'rgba(15, 23, 41, 0.12)', background: 'rgba(15, 23, 41, 0.04)' }}
        >
          F{entry.floor}
        </span>
      </div>
      {hovered && <Tooltip entry={entry} palette={palette} />}
    </td>
  )
}

function EmptyCell({ colSpan = 1 }) {
  return (
    <td colSpan={colSpan} role="gridcell" className="p-1 align-top">
      <div
        className="flex h-full min-h-[52px] w-full items-center justify-center rounded-lg border border-dashed border-border-base"
        aria-label="Empty slot"
      />
    </td>
  )
}

function GridSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-dim" role="status" aria-label="Loading timetable">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="border-b border-border-dim">
            <th className="w-16 py-3" />
            {FALLBACK_DAYS.map((d) => <th key={d} className="py-3 px-2"><div className="skeleton h-4 w-16 mx-auto" /></th>)}
          </tr>
        </thead>
        <tbody>
          {FALLBACK_SLOTS.map((t) => (
            <tr key={t} className="border-b border-border-dim/50">
              <td className="py-2 px-2"><div className="skeleton h-3 w-10" /></td>
              {FALLBACK_DAYS.map((d) => <td key={d} className="p-1"><div className="skeleton h-14 rounded-lg" /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Single-batch grid ─────────────────────────────────────────────────────────

function SingleBatchGrid({ grid, subjectColorMap, days, slots }) {
  const nav = useRovingGrid()

  return (
    <div className="overflow-x-auto rounded-xl border border-border-base shadow-card animate-fade-in">
      <table className="w-full border-collapse table-fixed" role="grid" aria-label="Weekly timetable">
        <colgroup>
          <col className="w-14" />
          {days.map((d) => <col key={d} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-border-base bg-bg-2">
            <th scope="col" className="sticky left-0 z-20 bg-bg-2 py-3 px-3 text-left font-mono text-2xs font-500 text-text-muted uppercase tracking-widest">Time</th>
            {days.map((day) => (
              <th key={day} scope="col" className="py-3 px-2 text-center font-display text-xs font-700 text-text-secondary uppercase tracking-wide">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{shortDay(day)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slotTime, slotIndex) => {
            const rowCells = days.map((day) => {
              const cell = grid[day]?.[slotIndex]
              if (!cell) return { type: 'empty' }
              const visible = cell.entries.filter((e) => !cell.skipRender.has(`${e.subject}::${e.room}`))
              if (visible.length === 0) return { type: 'empty' }
              const entry = visible[0]
              const isLabStart = entry.type === 'Lab' &&
                grid[day]?.[slotIndex + 1]?.entries.some((e) => e.room === entry.room && e.subject === entry.subject)
              return { type: 'single', entry, rowSpan: isLabStart ? 2 : 1 }
            })

            return (
              <tr key={slotTime} className="border-b border-border-dim/40 hover:bg-bg-2/40 transition-colors duration-100">
                <th scope="row" className="sticky left-0 z-10 bg-bg-0 py-2 px-3 text-left font-mono text-2xs font-500 text-text-muted whitespace-nowrap align-top pt-3">
                  {slotTime}
                </th>
                {rowCells.map((cell, di) => {
                  const day = days[di]
                  const prevSlotCell = grid[day]?.[slotIndex - 1]
                  const isContinued = slotIndex > 0 && prevSlotCell?.entries.some((e) =>
                    e.type === 'Lab' && grid[day]?.[slotIndex]?.entries.some((ce) => ce.room === e.room && ce.subject === e.subject)
                  )
                  if (isContinued) return null
                  if (cell.type === 'empty') return <EmptyCell key={day} />
                  const palette = PALETTES[subjectColorMap[cell.entry.subject] ?? hashSubject(cell.entry.subject)]
                  return (
                    <SessionCell
                      key={day}
                      entry={cell.entry}
                      palette={palette}
                      rowSpan={cell.rowSpan}
                      nav={nav}
                      row={slotIndex}
                      col={di}
                    />
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── All-batches grid: batch sub-columns within each day ───────────────────────

function AllBatchesGrid({ timetable, batches, subjectColorMap, days, slots }) {
  const nav = useRovingGrid()

  // Build per-batch grids
  const batchGrids = {}
  for (const b of batches) {
    batchGrids[b] = buildGrid(timetable, b, days, slots)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-base shadow-card animate-fade-in">
      <table className="border-collapse" style={{ minWidth: `${56 + batches.length * days.length * 140}px` }} role="grid" aria-label="Weekly timetable — all batches">
        <colgroup>
          <col style={{ width: 56 }} />
          {days.flatMap((d) => batches.map((b) => <col key={`${d}-${b}`} style={{ width: 140 }} />))}
        </colgroup>

        <thead>
          {/* Day header row */}
          <tr className="border-b border-border-base bg-bg-2">
            <th rowSpan={2} className="sticky left-0 z-20 bg-bg-2 py-3 px-3 text-left font-mono text-2xs font-500 text-text-muted uppercase tracking-widest border-r border-border-dim">
              Time
            </th>
            {days.map((day) => (
              <th
                key={day}
                colSpan={batches.length}
                className="py-2 px-2 text-center font-display text-xs font-700 text-text-secondary uppercase tracking-wide border-r border-border-dim"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{shortDay(day)}</span>
              </th>
            ))}
          </tr>
          {/* Batch sub-header row */}
          <tr className="border-b border-border-dim bg-bg-2">
            {days.flatMap((day) =>
              batches.map((batch, bi) => (
                <th
                  key={`${day}-${batch}`}
                  className={`py-1.5 px-2 text-center font-mono text-2xs font-600 text-text-muted uppercase tracking-widest ${
                    bi === batches.length - 1 ? 'border-r border-border-dim' : ''
                  }`}
                >
                  {batch}
                </th>
              ))
            )}
          </tr>
        </thead>

        <tbody>
          {slots.map((slotTime, slotIndex) => (
            <tr key={slotTime} className="border-b border-border-dim/40 hover:bg-bg-2/40 transition-colors duration-100">
              <th scope="row" className="sticky left-0 z-10 bg-bg-0 py-2 px-3 text-left font-mono text-2xs font-500 text-text-muted whitespace-nowrap align-top pt-3 border-r border-border-dim">
                {slotTime}
              </th>
              {/* `di` is the day index — keyboard navigation needs it to
                  compute each cell's column as (day × batches) + batch. */}
              {days.flatMap((day, di) =>
                batches.map((batch, bi) => {
                  const grid = batchGrids[batch]
                  const cell = grid[day]?.[slotIndex]
                  const isLastBatch = bi === batches.length - 1

                  // Check lab continuation from above
                  const prevCell = grid[day]?.[slotIndex - 1]
                  const isContinued = slotIndex > 0 && prevCell?.entries.some((e) =>
                    e.type === 'Lab' && grid[day]?.[slotIndex]?.entries.some((ce) => ce.room === e.room && ce.subject === e.subject)
                  )
                  if (isContinued) return null

                  if (!cell) return (
                    <td key={`${day}-${batch}`} className={`p-1 align-top ${isLastBatch ? 'border-r border-border-dim' : ''}`}>
                      <div className="flex h-full min-h-[52px] w-full items-center justify-center rounded-lg border border-dashed border-border-base" />
                    </td>
                  )

                  const visible = cell.entries.filter((e) => !cell.skipRender.has(`${e.subject}::${e.room}`))
                  if (visible.length === 0) return (
                    <td key={`${day}-${batch}`} className={`p-1 align-top ${isLastBatch ? 'border-r border-border-dim' : ''}`}>
                      <div className="flex h-full min-h-[52px] w-full items-center justify-center rounded-lg border border-dashed border-border-base" />
                    </td>
                  )

                  const entry = visible[0]
                  const isLabStart = entry.type === 'Lab' &&
                    grid[day]?.[slotIndex + 1]?.entries.some((e) => e.room === entry.room && e.subject === entry.subject)
                  const rowSpan = isLabStart ? 2 : 1
                  const palette = PALETTES[subjectColorMap[entry.subject] ?? hashSubject(entry.subject)]

                  return (
                    <td
                      key={`${day}-${batch}`}
                      rowSpan={rowSpan}
                      role="gridcell"
                      className={`relative p-1 align-top ${isLastBatch ? 'border-r border-border-dim' : ''}`}
                    >
                      <AllBatchCell
                        entry={entry}
                        palette={palette}
                        rowSpan={rowSpan}
                        nav={nav}
                        row={slotIndex}
                        col={di * batches.length + bi}
                      />
                    </td>
                  )
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AllBatchCell({ entry, palette, rowSpan, nav, row, col }) {
  const [hovered, setHovered] = useState(false)
  const isLab = entry.type === 'Lab'
  return (
    <div
      ref={(el) => nav?.register(row, col, el)}
      tabIndex={nav ? (nav.isActive(row, col) ? 0 : -1) : 0}
      onKeyDown={(e) => nav?.handleKeyDown(e, row, col)}
      aria-label={`${entry.subject} — ${entry.type} in ${entry.room}`}
      className="relative flex h-full w-full cursor-default flex-col justify-between rounded-lg border p-2 transition-all duration-150 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      style={{ background: palette.bg, borderColor: palette.border, minHeight: rowSpan > 1 ? '108px' : '52px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span className="truncate text-2xs font-600 leading-tight" style={{ color: palette.text }}>
        {entry.subject}
      </span>
      <div className="flex items-center justify-between gap-1 mt-1">
        <span className="font-mono text-2xs text-text-muted">{entry.room}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-2xs font-600 uppercase tracking-wide ${isLab ? 'pill-lab' : 'pill-theory'}`}>
          {isLab ? 'Lab' : 'Th'}
        </span>
      </div>
      {hovered && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg border border-border-bright bg-bg-4 p-3 shadow-lg pointer-events-none animate-fade-in text-left"
          style={{ borderColor: palette.border }}
        >
          <p className="font-display text-xs font-700 text-text-primary mb-1">{entry.subject}</p>
          {entry.batch && <div className="flex justify-between"><span className="text-2xs text-text-muted">Batch</span><span className="text-2xs text-text-secondary">{entry.batch}</span></div>}
          <div className="flex justify-between"><span className="text-2xs text-text-muted">Room</span><span className="font-mono text-2xs text-text-secondary">{entry.room}</span></div>
          <div className="flex justify-between"><span className="text-2xs text-text-muted">Floor</span><span className="text-2xs text-text-secondary">Floor {entry.floor}</span></div>
        </div>
      )}
    </div>
  )
}

/**
 * Maps each colour back to its subject.
 *
 * Inside the grid a cell's subject is conveyed by its colour and a truncated
 * name. Colour alone is not a reliable channel — roughly 1 in 12 men has some
 * form of colour-vision deficiency, and several of the six palettes differ
 * mainly in hue. The legend gives the same information as text, and acts as a
 * key so the grid can be read without decoding colours at all.
 */
function SubjectLegend({ subjects, subjectColorMap }) {
  if (subjects.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Subject colour key">
      {subjects.map((subject) => {
        const palette = PALETTES[subjectColorMap[subject] ?? hashSubject(subject)]
        return (
          <span key={subject} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm border"
              style={{ background: palette.bg, borderColor: palette.border }}
              aria-hidden="true"
            />
            {subject}
          </span>
        )
      })}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TimetableGrid({ timetable, loading = false, days, slots }) {
  const batches = useMemo(() => extractBatches(timetable), [timetable])

  // Null means "not chosen yet" so the default can follow the data once it
  // arrives. Showing every batch at once puts 15+ columns on screen, far past
  // what anyone can hold or scan (Miller's 7±2; Shneiderman 8, reduce
  // short-term memory load), so a single batch is the default view and "All"
  // becomes an explicit opt-in.
  const [selectedBatch, setSelectedBatch] = useState(null)
  const activeBatch = selectedBatch ?? (batches.length > 1 ? batches[0] : 'All')

  // Days/slots are configurable, so they arrive from /timings. Anything only
  // present in the timetable is folded in so no session is ever hidden.
  const axes = useMemo(() => resolveAxes(timetable, days, slots), [timetable, days, slots])

  // Build subject color map (consistent across all views)
  const subjectColorMap = useMemo(() => {
    const map = {}
    let idx = 0
    if (!timetable) return map
    for (const dayData of Object.values(timetable)) {
      for (const entries of Object.values(dayData)) {
        for (const e of entries) {
          if (!(e.subject in map)) map[e.subject] = idx++ % PALETTES.length
        }
      }
    }
    return map
  }, [timetable])

  const grid = useMemo(
    () => buildGrid(timetable, activeBatch === 'All' ? null : activeBatch, axes.days, axes.slots),
    [timetable, activeBatch, axes]
  )

  // Only the subjects actually on screen, so the key matches the filtered view.
  const visibleSubjects = useMemo(() => {
    const seen = new Set()
    for (const dayData of Object.values(timetable ?? {})) {
      for (const entries of Object.values(dayData)) {
        for (const e of entries) {
          if (activeBatch === 'All' || e.batch === activeBatch) seen.add(e.subject)
        }
      }
    }
    return [...seen].sort()
  }, [timetable, activeBatch])

  if (loading) return <GridSkeleton />

  const tabs = ['All', ...batches]

  return (
    <div>
      {/* Batch filter tabs */}
      {batches.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by batch">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeBatch === tab}
              onClick={() => setSelectedBatch(tab)}
              className={`
                rounded-lg border px-3 py-1.5 font-mono text-xs font-600 transition-all duration-150 cursor-pointer
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
                ${activeBatch === tab
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-border-base bg-bg-2 text-text-muted hover:border-border-bright hover:text-text-secondary'}
              `}
            >
              {tab === 'All' ? 'All Batches' : tab}
            </button>
          ))}
          {activeBatch === 'All' && batches.length > 0 && (
            <span className="ml-1 text-xs text-text-muted">
              — every batch side by side; wide
            </span>
          )}
        </div>
      )}

      <SubjectLegend subjects={visibleSubjects} subjectColorMap={subjectColorMap} />

      {/* Grid */}
      {activeBatch === 'All' && batches.length > 1
        ? <AllBatchesGrid timetable={timetable} batches={batches} subjectColorMap={subjectColorMap} days={axes.days} slots={axes.slots} />
        : <SingleBatchGrid grid={grid} subjectColorMap={subjectColorMap} days={axes.days} slots={axes.slots} />
      }
    </div>
  )
}
