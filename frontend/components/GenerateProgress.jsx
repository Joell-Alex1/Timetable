'use client'

import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'

/**
 * Shown while the solver is running.
 *
 * Bridges Norman's Gulf of Evaluation: without this, pressing Generate gives
 * a spinning icon and nothing else, so the user cannot tell whether the system
 * is working, stuck, or has silently failed (Nielsen 1, visibility of system
 * status).
 *
 * Deliberately *not* a percentage bar. POST /schedule runs the CSP solver
 * synchronously in a single request and reports nothing until it finishes, so
 * any percentage would be fabricated. Instead this shows two things that are
 * actually true: how long it has been running, and the size of the problem
 * being solved.
 */
export default function GenerateProgress({ problem }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 0.1), 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-10 overflow-hidden rounded-xl border border-accent/30 bg-bg-2 animate-fade-in"
    >
      <div className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-accent-soft">
          <Cpu size={18} className="text-accent animate-pulse-slow" aria-hidden="true" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-600 text-text-primary">
            Searching for a conflict-free arrangement…
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {problem
              ? `${problem.subjects} subjects · ${problem.rooms} rooms · ${problem.days} days × ${problem.slots} slots`
              : 'Working through the constraints'}
          </p>
        </div>

        <span className="shrink-0 font-mono text-sm tabular-nums text-text-secondary">
          {elapsed.toFixed(1)}s
        </span>
      </div>

      {/* Indeterminate: signals activity without claiming a false percentage */}
      <div className="h-1 w-full overflow-hidden bg-bg-1" aria-hidden="true">
        <div className="progress-indeterminate h-full w-1/4 bg-accent/70" />
      </div>
    </div>
  )
}
