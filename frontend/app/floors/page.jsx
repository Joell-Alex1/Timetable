'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import Navbar from '../../components/Navbar'
import PageHeader from '../../components/PageHeader'
import Button from '../../components/Button'
import FloorMap from '../../components/FloorMap'
import StaleBanner from '../../components/StaleBanner'
import { getTimetable, getRoomSummary, getRooms, isHttpStatus } from '../../lib/api'

export default function FloorsPage() {
  const [timetable, setTimetable]       = useState(null)
  const [roomSummary, setRoomSummary]   = useState(null)
  const [rooms, setRooms]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // A missing timetable is an expected empty state, not an error.
      const nullOn404 = (err) => { if (isHttpStatus(err, 404)) return null; throw err }
      const [tt, rs, rm] = await Promise.all([
        getTimetable().catch(nullOn404),
        getRoomSummary().catch(nullOn404),
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
        <PageHeader
          title="Floor Map"
          subtitle={
            totalUsed !== null
              ? `${totalUsed} of ${rooms.length} rooms in use`
              : 'Room utilisation by floor'
          }
          actions={
            <Button onClick={load} disabled={loading} aria-label="Refresh floor data">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          }
        />

        {/* Out-of-date warning — regenerating reloads the map below */}
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

        {/* No data */}
        {!loading && !error && !timetable && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-base bg-bg-2 p-12 text-center">
            <p className="text-text-secondary">No floor data available yet.</p>
            <Link href="/">
              <Button variant="primary">Generate a schedule first</Button>
            </Link>
          </div>
        )}

        <FloorMap timetable={timetable} roomSummary={roomSummary} rooms={rooms} loading={loading} />
      </main>
    </div>
  )
}
