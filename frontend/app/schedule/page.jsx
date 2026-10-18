'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import Navbar from '../../components/Navbar'
import PageHeader from '../../components/PageHeader'
import Button from '../../components/Button'
import TimetableGrid from '../../components/TimetableGrid'
import StaleBanner from '../../components/StaleBanner'
import { getTimetable, getTimings, isHttpStatus } from '../../lib/api'

export default function SchedulePage() {
  const [data, setData]       = useState(null)
  const [timings, setTimings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Days and slots drive the grid axes; they are configurable, so the grid
      // must not assume Mon–Fri / 9:00–16:00. A missing timetable is an
      // expected empty state and must not stop the timings from loading.
      const [result, tm] = await Promise.all([
        getTimetable().catch((err) => {
          if (isHttpStatus(err, 404)) return null
          throw err
        }),
        getTimings(),
      ])
      setData(result)
      setTimings(tm)
    } catch (err) {
      setError(err.message || 'Failed to load timetable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-dvh bg-bg-0">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <PageHeader
          title="Weekly Timetable"
          subtitle={
            data?.stats
              ? `${data.stats.total_sessions_scheduled} sessions · ${data.stats.subjects_fully_scheduled} subjects`
              : 'Generated schedule'
          }
          actions={
            <Button onClick={load} disabled={loading} aria-label="Refresh timetable">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          }
        />

        {/* Out-of-date warning — regenerating reloads the grid below */}
        <StaleBanner onRegenerated={load} />

        {/* Error state */}
        {error && !loading && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger"
          >
            <span>{error}</span>
            <Button variant="danger" onClick={load} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* No data state — explains what to do next (Nielsen 10) */}
        {!loading && !error && !data?.timetable && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-base bg-bg-2 p-12 text-center">
            <p className="text-text-secondary">No timetable available yet.</p>
            <Link href="/">
              <Button variant="primary">Generate a schedule first</Button>
            </Link>
          </div>
        )}

        {/* The session-type key used to live here, stacking a third control
            row on top of the grid's own batch tabs and subject key. It now
            sits inside the grid component so all three read as one toolbar
            instead of three competing bands. */}

        {/* Timetable grid */}
        <TimetableGrid
          timetable={data?.timetable}
          loading={loading}
          days={timings?.days}
          slots={timings?.slots}
        />

        {/* Message */}
        {data?.message && (
          <p className="mt-4 text-center text-2xs text-text-muted">{data.message}</p>
        )}
      </main>
    </div>
  )
}
