'use client'

import { AlertTriangle, Users, Clock, DoorOpen, RefreshCw } from 'lucide-react'
import GenerateButton from './GenerateButton'

const SUGGESTIONS = [
  { icon: Users,    text: 'Reduce the number of subjects or sessions' },
  { icon: Clock,    text: 'Increase available time slots or working hours' },
  { icon: DoorOpen, text: 'Verify room availability and capacity constraints' },
]

export default function FailureScreen({ message, onRetry, loading = false }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center gap-8 rounded-2xl border border-red-500/20 bg-bg-2 p-10 text-center animate-fade-in"
    >
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
        <AlertTriangle size={28} className="text-red-400" aria-hidden="true" />
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

      {/* Suggestions */}
      <div className="w-full max-w-sm rounded-xl border border-border-base bg-bg-3 p-5">
        <p className="mb-4 text-xs font-600 uppercase tracking-widest text-text-muted">
          Suggestions
        </p>
        <ul className="flex flex-col gap-3" role="list">
          {SUGGESTIONS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <Icon size={15} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="text-sm text-text-secondary">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Retry */}
      <GenerateButton
        onClick={onRetry}
        loading={loading}
        label="Try Again"
      />
    </div>
  )
}
