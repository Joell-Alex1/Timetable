'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Navbar from '../../components/Navbar'
import TimetableGrid from '../../components/TimetableGrid'
import { getTimetable } from '../../lib/api'

export default function SchedulePage() {
  const router = useRouter()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await getTimetable()
      setData(result)
    } catch (err) {
      if (err.message?.startsWith('HTTP 404')) {
        setData(null)
      } else {
        setError(err.message || 'Failed to load timetable.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-dvh bg-bg-0">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              aria-label="Back to dashboard"
              className="
                flex h-9 w-9 items-center justify-center rounded-lg border border-border-base
                bg-bg-2 text-text-secondary transition-all duration-150
                hover:border-border-bright hover:text-text-primary cursor-pointer
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
              "
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-800 text-text-primary">Weekly Timetable</h1>
              <p className="text-sm text-text-muted">
                {data?.stats
                  ? `${data.stats.total_sessions_scheduled} sessions · ${data.stats.subjects_fully_scheduled} subjects`
                  : 'Generated schedule'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh timetable"
            className="
              flex items-center gap-2 rounded-lg border border-border-base
              bg-bg-2 px-4 py-2 text-sm text-text-secondary
              transition-all duration-150 hover:border-border-bright hover:text-text-primary
              cursor-pointer disabled:opacity-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
            "
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-400"
          >
            <span className="font-mono">{error}</span>
            <button
              type="button"
              onClick={load}
              className="ml-auto shrink-0 rounded-md border border-red-500/20 px-3 py-1 text-xs hover:bg-red-500/10 cursor-pointer focus-visible:outline focus-visible:outline-accent"
            >
              Retry
            </button>
          </div>
        )}

        {/* No data state */}
        {!loading && !error && !data?.timetable && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-base bg-bg-2 p-12 text-center">
            <p className="text-text-secondary">No timetable available yet.</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 cursor-pointer focus-visible:outline focus-visible:outline-accent"
            >
              Generate a schedule first
            </button>
          </div>
        )}

        {/* Legend */}
        {(data?.timetable || loading) && (
          <div
            className="mb-4 flex flex-wrap items-center gap-4 text-xs text-text-muted"
            aria-label="Timetable legend"
          >
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded pill-theory" aria-hidden="true" />
              Theory session
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded pill-lab" aria-hidden="true" />
              Lab session (2 hours)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-dashed border-border-dim" aria-hidden="true" />
              Empty slot
            </span>
          </div>
        )}

        {/* Timetable grid */}
        <TimetableGrid timetable={data?.timetable} loading={loading} />

        {/* Message */}
        {data?.message && (
          <p className="mt-4 text-center text-xs text-text-muted">{data.message}</p>
        )}
      </main>
    </div>
  )
}
