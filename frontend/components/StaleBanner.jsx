'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { getScheduleStatus, generateSchedule } from '../lib/api'

/**
 * Warns that the saved timetable no longer matches the current subjects,
 * rooms or timings, and offers to regenerate.
 *
 * Without this the UI presents a stale schedule as if it were current —
 * Nielsen 1 (visibility of system status) and Norman's Gulf of Evaluation:
 * the user cannot tell, by looking, whether what they see reflects what they
 * just changed.
 *
 * `refreshKey` — bump it after any edit to re-check staleness.
 * `onRegenerated` — called after a successful regenerate so the host page can
 * reload whatever it is displaying.
 */
export default function StaleBanner({ refreshKey = 0, onRegenerated }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const check = useCallback(async () => {
    try {
      setStatus(await getScheduleStatus())
    } catch {
      setStatus(null)   // never block the page on this advisory check
    }
  }, [])

  useEffect(() => { check() }, [check, refreshKey])

  async function handleRegenerate() {
    setBusy(true)
    setError(null)
    try {
      const result = await generateSchedule()
      if (result.status !== 'success') {
        setError(result.message || 'Could not regenerate the timetable.')
      } else {
        await check()
        onRegenerated?.()
      }
    } catch (err) {
      setError(err.message || 'Could not regenerate the timetable.')
    } finally {
      setBusy(false)
    }
  }

  if (!status?.stale) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        mb-6 flex flex-col gap-3 rounded-xl border border-status-warning/35
        bg-status-warning/8 p-4 animate-fade-in
        sm:flex-row sm:items-center sm:justify-between
      "
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-status-warning" aria-hidden="true" />
        <div>
          <p className="text-sm font-600 text-status-warning">
            This timetable is out of date
          </p>
          {status.changes?.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 text-2xs text-text-secondary">
              {status.changes.slice(0, 4).map((c) => <li key={c}>· {c}</li>)}
              {status.changes.length > 4 && (
                <li>· and {status.changes.length - 4} more change(s)</li>
              )}
            </ul>
          )}
          {error && <p className="mt-2 text-2xs text-status-danger">{error}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={handleRegenerate}
        disabled={busy}
        className="
          flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg
          border border-transparent bg-status-warning px-4 text-sm font-600
          text-white transition-colors duration-150 hover:bg-status-warning/90
          disabled:opacity-50 cursor-pointer
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-status-warning
        "
      >
        <RefreshCw size={15} className={busy ? 'animate-spin' : ''} aria-hidden="true" />
        {busy ? 'Regenerating…' : 'Regenerate'}
      </button>
    </div>
  )
}
