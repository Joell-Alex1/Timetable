'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Navbar from '../../components/Navbar'
import FloorMap from '../../components/FloorMap'
import { getTimetable, getRoomSummary, getRooms } from '../../lib/api'

export default function FloorsPage() {
  const router = useRouter()
  const [timetable, setTimetable]       = useState(null)
  const [roomSummary, setRoomSummary]   = useState(null)
  const [rooms, setRooms]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [tt, rs, rm] = await Promise.all([
        getTimetable().catch((err) => { if (err.message?.startsWith('HTTP 404')) return null; throw err }),
        getRoomSummary().catch((err) => { if (err.message?.startsWith('HTTP 404')) return null; throw err }),
        getRooms(),
      ])
      setRooms(rm.rooms)
      setTimetable(tt?.timetable ?? null)
      setRoomSummary(rs?.room_summary ?? null)
    } catch (err) {
      setError(err.message || 'Failed to load floor data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Summary counts
  const totalUsed = roomSummary
    ? Object.values(roomSummary).reduce(
        (acc, f) => acc + f.theory.length + f.lab.length,
        0
      )
    : null

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
              <h1 className="font-display text-2xl font-800 text-text-primary">Floor Map</h1>
              <p className="text-sm text-text-muted">
                {totalUsed !== null
                  ? `${totalUsed} of ${rooms.length} rooms in use`
                  : 'Room utilisation by floor'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh floor data"
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

        {/* No data */}
        {!loading && !error && !timetable && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-base bg-bg-2 p-12 text-center">
            <p className="text-text-secondary">No floor data available yet.</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 cursor-pointer focus-visible:outline focus-visible:outline-accent"
            >
              Generate a schedule first
            </button>
          </div>
        )}

        <FloorMap timetable={timetable} roomSummary={roomSummary} rooms={rooms} loading={loading} />
      </main>
    </div>
  )
}
