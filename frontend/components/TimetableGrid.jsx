'use client'

import { useState, useMemo } from 'react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const SLOT_TIMES = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

const PALETTES = [
  { bg: 'rgba(59,130,246,0.13)',  border: 'rgba(59,130,246,0.38)',  text: '#93C5FD', dot: '#3B82F6' },
  { bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.38)',  text: '#6EE7B7', dot: '#10B981' },
  { bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.38)',  text: '#FCD34D', dot: '#F59E0B' },
  { bg: 'rgba(239,68,68,0.13)',  border: 'rgba(239,68,68,0.38)',   text: '#FCA5A5', dot: '#EF4444' },
  { bg: 'rgba(139,92,246,0.13)', border: 'rgba(139,92,246,0.38)',  text: '#C4B5FD', dot: '#8B5CF6' },
  { bg: 'rgba(249,115,22,0.13)', border: 'rgba(249,115,22,0.38)',  text: '#FDBA74', dot: '#F97316' },
]

function hashSubject(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % PALETTES.length
}

/**
 * Build grid[day][slotIndex] = { entries, skipRender }
 * Optionally filter to a specific batch.
 */
function buildGrid(timetable, batchFilter) {
  const grid = {}
  for (const day of DAYS) {
    grid[day] = {}
    for (let i = 0; i < SLOT_TIMES.length; i++) {
      grid[day][i] = { entries: [], skipRender: new Set() }
    }
  }

  if (!timetable) return grid

  for (const day of DAYS) {
    const dayData = timetable[day]
    if (!dayData) continue
    for (const [slotTime, entries] of Object.entries(dayData)) {
      const slotIndex = SLOT_TIMES.indexOf(slotTime)
      if (slotIndex === -1) continue
      for (const entry of entries) {
        if (batchFilter && batchFilter !== 'All' && entry.batch !== batchFilter) continue
        grid[day][slotIndex].entries.push({ ...entry })
      }
    }
  }

  // Mark lab continuation slots (slot N+1 for a lab starting at slot N)
  for (const day of DAYS) {
    for (let i = 0; i < SLOT_TIMES.length - 1; i++) {
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
      <span className="text-[10px] text-text-muted">{label}</span>
      <span className={`text-[11px] font-500 text-text-secondary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function SessionCell({ entry, palette, rowSpan = 1 }) {
  const [hovered, setHovered] = useState(false)
  const isLab = entry.type === 'Lab'

  return (
    <td
      rowSpan={rowSpan}
      className="relative p-1 align-top"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div
        tabIndex={0}
        role="button"
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
          <span className="truncate text-[11px] font-600 leading-tight" style={{ color: palette.text }}>
            {entry.subject}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-1">
          <span className="font-mono text-[10px] text-text-muted">{entry.room}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-600 uppercase tracking-wide ${isLab ? 'pill-lab' : 'pill-theory'}`}>
            {isLab ? 'Lab' : 'Th'}
          </span>
        </div>
        <span
          className="mt-0.5 inline-flex w-fit items-center rounded-sm border px-1.5 py-0.5 font-mono text-[9px] text-text-muted"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
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
    <td colSpan={colSpan} className="p-1 align-top">
      <div
        className="flex h-full min-h-[52px] w-full items-center justify-center rounded-lg border border-dashed border-border-dim"
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
            {DAYS.map((d) => <th key={d} className="py-3 px-2"><div className="skeleton h-4 w-16 mx-auto" /></th>)}
          </tr>
        </thead>
        <tbody>
          {SLOT_TIMES.map((t) => (
            <tr key={t} className="border-b border-border-dim/50">
              <td className="py-2 px-2"><div className="skeleton h-3 w-10" /></td>
              {DAYS.map((d) => <td key={d} className="p-1"><div className="skeleton h-14 rounded-lg" /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Single-batch grid ─────────────────────────────────────────────────────────

function SingleBatchGrid({ grid, subjectColorMap }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-base shadow-card animate-fade-in">
      <table className="w-full border-collapse table-fixed" role="grid" aria-label="Weekly timetable">
        <colgroup>
          <col className="w-14" />
          {DAYS.map((d) => <col key={d} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-border-base bg-bg-2">
            <th scope="col" className="py-3 px-3 text-left font-mono text-[10px] font-500 text-text-muted uppercase tracking-widest">Time</th>
            {DAYS.map((day, i) => (
              <th key={day} scope="col" className="py-3 px-2 text-center font-display text-xs font-700 text-text-secondary uppercase tracking-wide">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAY_SHORT[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOT_TIMES.map((slotTime, slotIndex) => {
            const rowCells = DAYS.map((day) => {
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
                <th scope="row" className="py-2 px-3 text-left font-mono text-[11px] font-500 text-text-muted whitespace-nowrap align-top pt-3">
                  {slotTime}
                </th>
                {rowCells.map((cell, di) => {
                  const day = DAYS[di]
                  const prevSlotCell = grid[day]?.[slotIndex - 1]
                  const isContinued = slotIndex > 0 && prevSlotCell?.entries.some((e) =>
                    e.type === 'Lab' && grid[day]?.[slotIndex]?.entries.some((ce) => ce.room === e.room && ce.subject === e.subject)
                  )
                  if (isContinued) return null
                  if (cell.type === 'empty') return <EmptyCell key={day} />
                  const palette = PALETTES[subjectColorMap[cell.entry.subject] ?? hashSubject(cell.entry.subject)]
                  return <SessionCell key={day} entry={cell.entry} palette={palette} rowSpan={cell.rowSpan} />
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

function AllBatchesGrid({ timetable, batches, subjectColorMap }) {
  // Build per-batch grids
  const batchGrids = {}
  for (const b of batches) {
    batchGrids[b] = buildGrid(timetable, b)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-base shadow-card animate-fade-in">
      <table className="border-collapse" style={{ minWidth: `${56 + batches.length * DAYS.length * 140}px` }} role="grid" aria-label="Weekly timetable — all batches">
        <colgroup>
          <col style={{ width: 56 }} />
          {DAYS.flatMap((d) => batches.map((b) => <col key={`${d}-${b}`} style={{ width: 140 }} />))}
        </colgroup>

        <thead>
          {/* Day header row */}
          <tr className="border-b border-border-base bg-bg-2">
            <th rowSpan={2} className="py-3 px-3 text-left font-mono text-[10px] font-500 text-text-muted uppercase tracking-widest border-r border-border-dim">
              Time
            </th>
            {DAYS.map((day, i) => (
              <th
                key={day}
                colSpan={batches.length}
                className="py-2 px-2 text-center font-display text-xs font-700 text-text-secondary uppercase tracking-wide border-r border-border-dim"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAY_SHORT[i]}</span>
              </th>
            ))}
          </tr>
          {/* Batch sub-header row */}
          <tr className="border-b border-border-dim bg-bg-2">
            {DAYS.flatMap((day, di) =>
              batches.map((batch, bi) => (
                <th
                  key={`${day}-${batch}`}
                  className={`py-1.5 px-2 text-center font-mono text-[9px] font-600 text-text-muted uppercase tracking-widest ${
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
          {SLOT_TIMES.map((slotTime, slotIndex) => (
            <tr key={slotTime} className="border-b border-border-dim/40 hover:bg-bg-2/40 transition-colors duration-100">
              <th scope="row" className="py-2 px-3 text-left font-mono text-[11px] font-500 text-text-muted whitespace-nowrap align-top pt-3 border-r border-border-dim">
                {slotTime}
              </th>
              {DAYS.flatMap((day, di) =>
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
                      <div className="flex h-full min-h-[52px] w-full items-center justify-center rounded-lg border border-dashed border-border-dim" />
                    </td>
                  )

                  const visible = cell.entries.filter((e) => !cell.skipRender.has(`${e.subject}::${e.room}`))
                  if (visible.length === 0) return (
                    <td key={`${day}-${batch}`} className={`p-1 align-top ${isLastBatch ? 'border-r border-border-dim' : ''}`}>
                      <div className="flex h-full min-h-[52px] w-full items-center justify-center rounded-lg border border-dashed border-border-dim" />
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
                      className={`relative p-1 align-top ${isLastBatch ? 'border-r border-border-dim' : ''}`}
                    >
                      <AllBatchCell entry={entry} palette={palette} rowSpan={rowSpan} />
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

function AllBatchCell({ entry, palette, rowSpan }) {
  const [hovered, setHovered] = useState(false)
  const isLab = entry.type === 'Lab'
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`${entry.subject} — ${entry.type} in ${entry.room}`}
      className="relative flex h-full w-full cursor-default flex-col justify-between rounded-lg border p-2 transition-all duration-150 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      style={{ background: palette.bg, borderColor: palette.border, minHeight: rowSpan > 1 ? '108px' : '52px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span className="truncate text-[11px] font-600 leading-tight" style={{ color: palette.text }}>
        {entry.subject}
      </span>
      <div className="flex items-center justify-between gap-1 mt-1">
        <span className="font-mono text-[10px] text-text-muted">{entry.room}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-600 uppercase tracking-wide ${isLab ? 'pill-lab' : 'pill-theory'}`}>
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
          {entry.batch && <div className="flex justify-between"><span className="text-[10px] text-text-muted">Batch</span><span className="text-[11px] text-text-secondary">{entry.batch}</span></div>}
          <div className="flex justify-between"><span className="text-[10px] text-text-muted">Room</span><span className="font-mono text-[11px] text-text-secondary">{entry.room}</span></div>
          <div className="flex justify-between"><span className="text-[10px] text-text-muted">Floor</span><span className="text-[11px] text-text-secondary">Floor {entry.floor}</span></div>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TimetableGrid({ timetable, loading = false }) {
  const batches = useMemo(() => extractBatches(timetable), [timetable])
  const [selectedBatch, setSelectedBatch] = useState('All')

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
    () => buildGrid(timetable, selectedBatch === 'All' ? null : selectedBatch),
    [timetable, selectedBatch]
  )

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
              aria-selected={selectedBatch === tab}
              onClick={() => setSelectedBatch(tab)}
              className={`
                rounded-lg border px-3 py-1.5 font-mono text-xs font-600 transition-all duration-150 cursor-pointer
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
                ${selectedBatch === tab
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-border-base bg-bg-2 text-text-muted hover:border-border-bright hover:text-text-secondary'}
              `}
            >
              {tab === 'All' ? 'All Batches' : tab}
            </button>
          ))}
          {selectedBatch === 'All' && batches.length > 0 && (
            <span className="text-xs text-text-muted ml-1">
              — concurrent sessions shown side-by-side per day
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      {selectedBatch === 'All' && batches.length > 1
        ? <AllBatchesGrid timetable={timetable} batches={batches} subjectColorMap={subjectColorMap} />
        : <SingleBatchGrid grid={grid} subjectColorMap={subjectColorMap} />
      }
    </div>
  )
}
