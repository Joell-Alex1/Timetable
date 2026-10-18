'use client'

import Link from 'next/link'
import { AlertTriangle, Users, Clock, DoorOpen, BookOpen, SlidersHorizontal } from 'lucide-react'
import GenerateButton from './GenerateButton'

/**
 * Shown when the scheduler cannot produce a timetable.
 *
 * The backend reports exactly why it failed (see diagnose_failure), so the
 * real reasons are displayed rather than fixed advice — Shneiderman 3
 * (informative feedback) and Nielsen 9 (help users recognise, diagnose and
 * recover from errors). The generic suggestions remain only as a fallback for
 * when the solver genuinely cannot attribute the failure.
 */

const FALLBACK_SUGGESTIONS = [
  { icon: Users,    text: 'Reduce the number of subjects or sessions' },
  { icon: Clock,    text: 'Increase available time slots or working hours' },
  { icon: DoorOpen, text: 'Verify room availability and capacity constraints' },
]

// Recovery routes — an error the user cannot act on is only half-reported.
const ACTIONS = [
  { href: '/subjects',  label: 'Edit subjects',      icon: BookOpen },
  { href: '/resources', label: 'Rooms & timings',    icon: SlidersHorizontal },
]

export default function FailureScreen({ message, reasons = [], onRetry, loading = false }) {
  const hasReasons = reasons && reasons.length > 0

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center gap-8 rounded-xl border border-status-danger/30 bg-bg-2 p-10 text-center animate-fade-in"
    >
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-status-danger/30 bg-status-danger/10">
        <AlertTriangle size={28} className="text-status-danger" aria-hidden="true" />
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-700 text-text-primary">
          Schedule Could Not Be Generated
        </h2>
        {message && (
          <p className="max-w-md text-sm leading-relaxed text-text-secondary">
            {message}
          </p>
        )}
      </div>

      {/* What actually went wrong */}
      <div className="w-full max-w-md rounded-xl border border-border-base bg-bg-3 p-5 text-left">
        <p className="mb-4 text-2xs font-600 uppercase tracking-widest text-text-muted">
          {hasReasons ? 'What went wrong' : 'Suggestions'}
        </p>

        {hasReasons ? (
          <ul className="flex flex-col gap-3" role="list">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger"
                  aria-hidden="true"
                />
                <span className="text-sm leading-relaxed text-text-secondary">{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-3" role="list">
            {FALLBACK_SUGGESTIONS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon size={15} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="text-sm text-text-secondary">{text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recovery routes */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="
              flex h-11 items-center gap-2 rounded-lg border border-border-base
              bg-bg-3 px-4 text-sm text-text-secondary transition-colors duration-150
              hover:border-border-bright hover:text-text-primary cursor-pointer
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
            "
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>

      {/* Retry */}
      <GenerateButton onClick={onRetry} loading={loading} label="Try Again" />
    </div>
  )
}
