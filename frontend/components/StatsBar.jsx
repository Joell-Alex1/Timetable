'use client'

import { CalendarCheck, BookOpen, Layers, DoorOpen } from 'lucide-react'

const STATS = [
  {
    key: 'total_sessions_scheduled',
    label: 'Sessions Scheduled',
    icon: CalendarCheck,
    format: (v) => v ?? '—',
  },
  {
    key: 'subjects_fully_scheduled',
    label: 'Subjects Complete',
    icon: BookOpen,
    format: (v) => v ?? '—',
  },
  {
    key: 'floors_used',
    label: 'Floors Active',
    icon: Layers,
    format: (v) => (Array.isArray(v) ? v.length : '—'),
  },
  {
    key: 'unused_rooms_count',
    label: 'Unused Rooms',
    icon: DoorOpen,
    format: (v) => v ?? '—',
  },
]

export default function StatsBar({ stats, unusedRooms, loading = false }) {
  const data = {
    total_sessions_scheduled: stats?.total_sessions_scheduled,
    subjects_fully_scheduled: stats?.subjects_fully_scheduled,
    floors_used: stats?.floors_used,
    unused_rooms_count: unusedRooms?.length,
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="region"
      aria-label="Schedule statistics"
    >
      {STATS.map(({ key, label, icon: Icon, format }, i) => (
        <div
          key={key}
          className={`
            relative flex flex-col gap-2 rounded-xl border border-border-base
            bg-bg-2 p-4 overflow-hidden
            transition-all duration-200 hover:border-border-bright
            animate-slide-up stagger-${i + 1}
          `}
          style={{ animationFillMode: 'both' }}
        >
          {/* Background accent line */}
          <div
            className="absolute left-0 top-0 h-full w-0.5 bg-accent/40 rounded-r"
            aria-hidden="true"
          />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft">
              <Icon size={14} className="text-accent" aria-hidden="true" />
            </div>
            <span className="text-2xs font-medium text-text-secondary">{label}</span>
          </div>

          {loading ? (
            <div className="skeleton h-8 w-16" aria-hidden="true" />
          ) : (
            <span className="font-mono text-2xl font-600 text-text-primary tabular-nums">
              {format(data[key])}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
