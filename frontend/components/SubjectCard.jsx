'use client'

import { CheckCircle2, XCircle } from 'lucide-react'

// Deterministic palette (matches TimetableGrid/FloorMap)
const PALETTES = [
  { bar: '#3B82F6', border: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.08)',  text: '#93C5FD' },
  { bar: '#10B981', border: 'rgba(16,185,129,0.3)',  bg: 'rgba(16,185,129,0.08)',  text: '#6EE7B7' },
  { bar: '#F59E0B', border: 'rgba(245,158,11,0.3)',  bg: 'rgba(245,158,11,0.08)',  text: '#FCD34D' },
  { bar: '#EF4444', border: 'rgba(239,68,68,0.3)',   bg: 'rgba(239,68,68,0.08)',   text: '#FCA5A5' },
  { bar: '#8B5CF6', border: 'rgba(139,92,246,0.3)',  bg: 'rgba(139,92,246,0.08)',  text: '#C4B5FD' },
  { bar: '#F97316', border: 'rgba(249,115,22,0.3)',  bg: 'rgba(249,115,22,0.08)',  text: '#FDBA74' },
]

function ProgressBar({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-text-muted">{label}</span>
        <span className="font-mono text-[11px] text-text-secondary">
          {value}/{max}h
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${value} of ${max} hours`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function SubjectCard({ subject, scheduledTheory, scheduledLab, floors, paletteIdx, onDelete, deleting }) {
  const palette = PALETTES[paletteIdx % PALETTES.length]
  const theoryComplete = scheduledTheory >= subject.theory_hours
  const labComplete    = scheduledLab   >= subject.lab_hours
  const complete       = theoryComplete && labComplete

  const floorList = [...new Set(floors)].sort()

  return (
    <article
      className="
        flex flex-col gap-4 rounded-xl border p-5
        transition-all duration-200 hover:shadow-card-hover glow-border
        animate-slide-up
      "
      style={{
        background: palette.bg,
        borderColor: palette.border,
        animationFillMode: 'both',
      }}
      aria-label={`${subject.name} subject card`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-700 text-text-primary leading-snug">
            {subject.name}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {subject.theory_hours}h theory · {subject.lab_hours}h lab
          </p>
          {subject.batch && (
            <span
              className="mt-1.5 inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-600"
              style={{ borderColor: palette.border, color: palette.text, background: palette.bg }}
            >
              {subject.batch}
            </span>
          )}
        </div>

        {/* Status badge */}
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-600 ${
            complete
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
          aria-label={complete ? 'Fully scheduled' : 'Incomplete'}
        >
          {complete ? (
            <CheckCircle2 size={12} aria-hidden="true" />
          ) : (
            <XCircle size={12} aria-hidden="true" />
          )}
          {complete ? 'Complete' : 'Incomplete'}
        </div>
      </div>

      {/* Progress bars */}
      <div className="flex flex-col gap-3">
        <ProgressBar
          value={scheduledTheory}
          max={subject.theory_hours}
          color={palette.bar}
          label="Theory"
        />
        {subject.lab_hours > 0 && (
          <ProgressBar
            value={scheduledLab}
            max={subject.lab_hours}
            color={palette.bar}
            label="Lab"
          />
        )}
      </div>

      {/* Floor badges */}
      {floorList.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label={`Floors used: ${floorList.join(', ')}`}>
          {floorList.map((f) => (
            <span
              key={f}
              className="rounded-md border border-border-base bg-bg-3 px-2 py-0.5 font-mono text-[10px] text-text-muted"
            >
              Floor {f}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
