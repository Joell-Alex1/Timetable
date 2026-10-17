'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, Undo2, X } from 'lucide-react'
import Button from './Button'

/**
 * One toast. Rendered by ToastProvider — pages never construct this directly.
 *
 * Each variant carries an icon as well as a colour, because colour alone is
 * not a reliable signal for colour-blind users. Colour meanings follow the
 * same convention as the rest of the app: green success, red error, blue
 * informational.
 *
 * The auto-dismiss timer pauses on hover and focus so a control (especially
 * "Undo") cannot disappear while the user is moving toward it.
 */

const VARIANTS = {
  success: { icon: CheckCircle2, accent: 'text-status-success', bar: 'bg-status-success/60' },
  error:   { icon: AlertCircle,  accent: 'text-status-danger',  bar: 'bg-status-danger/60'  },
  info:    { icon: Info,         accent: 'text-accent',         bar: 'bg-accent/60'         },
}

export default function Toast({ variant = 'info', message, action, duration = 5000, onDismiss }) {
  const [remaining, setRemaining] = useState(duration)
  const [paused, setPaused] = useState(false)
  const [running, setRunning] = useState(false)
  const done = useRef(false)

  const { icon: Icon, accent, bar } = VARIANTS[variant] ?? VARIANTS.info

  useEffect(() => {
    if (paused || running) return
    if (remaining <= 0) {
      if (!done.current) { done.current = true; onDismiss?.() }
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 100), 100)
    return () => clearTimeout(id)
  }, [remaining, paused, running, onDismiss])

  async function handleAction() {
    setRunning(true)
    try {
      await action.onClick()
    } finally {
      done.current = true
      onDismiss?.()
    }
  }

  const pct = Math.max(0, (remaining / duration) * 100)

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className="
        pointer-events-auto overflow-hidden rounded-xl border border-border-bright
        bg-bg-3 shadow-lg animate-slide-up
      "
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center gap-3 p-4">
        <Icon size={18} className={`shrink-0 ${accent}`} aria-hidden="true" />
        <p className="flex-1 text-sm text-text-primary">{message}</p>

        {action && (
          <Button variant="secondary" onClick={handleAction} disabled={running}>
            <Undo2 size={15} aria-hidden="true" />
            {running ? 'Undoing…' : action.label}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => { done.current = true; onDismiss?.() }}
          aria-label="Dismiss"
        >
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {/* Time-remaining indicator — shows the window is closing */}
      <div className="h-1 w-full bg-bg-1" aria-hidden="true">
        <div className={`h-full transition-[width] duration-100 ease-linear ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
