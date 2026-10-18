'use client'

import { CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import Button from './Button'
import { SUBJECT_PALETTES as PALETTES } from '../lib/palette'


function ProgressBar({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-2xs text-text-muted">{label}</span>
        <span className="font-mono text-2xs text-text-secondary">
          {value}/{max}h
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(15, 23, 41, 0.10)' }}
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
          <p className="mt-0.5 text-2xs text-text-muted">
            {subject.theory_hours}h theory · {subject.lab_hours}h lab
          </p>
          {subject.batch && (
            <span
              className="mt-1.5 inline-block rounded-lg border px-2 py-0.5 font-mono text-2xs font-600"
              style={{ borderColor: palette.border, color: palette.text, background: palette.bg }}
            >
              {subject.batch}
            </span>
          )}
        </div>

        {/* Status + actions, grouped so neither can overlap the other */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-600 ${
              complete
                ? 'border-status-success/30 bg-status-success/10 text-status-success'
                : 'border-status-danger/30 bg-status-danger/10 text-status-danger'
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

          {onDelete && (
            <Button
              variant="danger"
              size="icon"
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Remove ${subject.name}`}
            >
              <Trash2 size={14} aria-hidden="true" />
            </Button>
          )}
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
              className="rounded-lg border border-border-base bg-bg-3 px-2 py-0.5 font-mono text-2xs text-text-muted"
            >
              Floor {f}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
