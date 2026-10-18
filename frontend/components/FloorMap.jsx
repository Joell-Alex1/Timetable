'use client'

import { useState } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'
import { SUBJECT_PALETTES as PALETTES, hashSubject } from '../lib/palette'

const SKELETON_ROWS = 5

/**
 * Build a room usage map from the timetable.
 *
 * A room is routinely shared by several subjects across the week, so
 * `subjects` is a list — keying only the first one seen would hide the rest
 * behind an inflated session count.
 */
function buildRoomOccupancy(timetable) {
  const occ = {} // room → { subjects: string[], types: Set, sessions: [{ day, time }] }
  if (!timetable) return occ

  for (const [day, slots] of Object.entries(timetable)) {
    for (const [time, entries] of Object.entries(slots)) {
      for (const entry of entries) {
        if (!occ[entry.room]) {
          occ[entry.room] = { subjects: [], types: new Set(), sessions: [] }
        }
        const room = occ[entry.room]
        if (!room.subjects.includes(entry.subject)) room.subjects.push(entry.subject)
        room.types.add(entry.type)
        room.sessions.push({ day, time })
      }
    }
  }
  return occ
}


function RoomCard({ room, occupancy }) {
  const info = occupancy[room]
  // Colour by the room's primary (first-scheduled) subject.
  const palette = info ? PALETTES[hashSubject(info.subjects[0])] : null
  // A room is only a lab room if everything in it is a lab.
  const isLab = info ? info.types.has('Lab') && info.types.size === 1 : false
  const sessionCount = info
    ? [...new Set(info.sessions.map((s) => `${s.day}-${s.time}`))].length
    : 0
  const extraSubjects = info ? info.subjects.length - 1 : 0

  if (!info) {
    return (
      <div
        className="flex flex-col gap-1 rounded-lg border border-dashed border-border-bright bg-bg-3/50 p-3"
        aria-label={`${room} — unused`}
      >
        <span className="font-mono text-2xs font-500 text-text-muted">{room}</span>
        <span className="text-2xs text-text-muted">Unused</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-1 rounded-lg border p-3 transition-all duration-150 hover:brightness-110 glow-border"
      style={{ background: palette.bg, borderColor: palette.border }}
      title={info.subjects.join(', ')}
      aria-label={`${room} — ${info.subjects.join(', ')}; ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xs font-600 text-text-secondary">{room}</span>
        <span
          className={`rounded-full px-1.5 py-px text-2xs font-600 uppercase tracking-wide ${
            isLab ? 'pill-lab' : 'pill-theory'
          }`}
        >
          {isLab ? 'Lab' : 'Th'}
        </span>
      </div>
      <span
        className="truncate text-2xs font-500 leading-tight"
        style={{ color: palette.text }}
      >
        {info.subjects[0]}
      </span>
      {extraSubjects > 0 && (
        <span className="truncate text-2xs text-text-secondary leading-tight">
          +{extraSubjects} more subject{extraSubjects !== 1 ? 's' : ''}
        </span>
      )}
      <span className="font-mono text-2xs text-text-muted">{sessionCount}× session</span>
    </div>
  )
}

function FloorAccordion({ floor, crRooms, clRooms, defaultOpen, roomSummary, occupancy }) {
  const [open, setOpen] = useState(defaultOpen)

  const usedTheory = (roomSummary?.[`floor_${floor}`]?.theory ?? []).length
  const usedLab    = (roomSummary?.[`floor_${floor}`]?.lab    ?? []).length

  return (
    <div className="rounded-xl border border-border-base overflow-hidden">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`floor-${floor}-content`}
        className="
          flex w-full items-center justify-between gap-4 px-5 py-4
          bg-bg-2 hover:bg-bg-3 transition-colors duration-150 cursor-pointer
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]
        "
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft border border-accent/15">
            <Building2 size={14} className="text-accent" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-display text-sm font-700 text-text-primary">Floor {floor}</p>
            <p className="text-2xs text-text-muted">
              {usedTheory}/{crRooms.length} theory rooms · {usedLab}/{clRooms.length} lab rooms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Utilisation pills */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border-base bg-bg-3 px-3 py-1 text-2xs text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {usedTheory + usedLab} active
          </span>
          <ChevronDown
            size={16}
            className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Accordion content */}
      {open && (
        <div
          id={`floor-${floor}-content`}
          className="border-t border-border-dim bg-bg-1 p-6"
          role="region"
          aria-label={`Floor ${floor} rooms`}
        >
          {/* Theory rooms */}
          <div className="mb-7">
            <p className="mb-3 text-2xs font-600 uppercase tracking-widest text-text-muted">
              Theory Rooms (CR) — {usedTheory}/{crRooms.length} in use
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {crRooms.map((r) => (
                <RoomCard key={r} room={r} occupancy={occupancy} />
              ))}
            </div>
          </div>

          {/* Lab rooms */}
          <div>
            <p className="mb-3 text-2xs font-600 uppercase tracking-widest text-text-muted">
              Lab Rooms (CL) — {usedLab}/{clRooms.length} in use
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {clRooms.map((r) => (
                <RoomCard key={r} room={r} occupancy={occupancy} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Skeleton loader for floor map */
function FloorMapSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading floor map">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className="skeleton h-16 rounded-xl" />
      ))}
    </div>
  )
}

export default function FloorMap({ timetable, roomSummary, rooms = [], loading = false }) {
  if (loading) return <FloorMapSkeleton />

  const occupancy = buildRoomOccupancy(timetable)
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b)

  if (floors.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-base p-8 text-center text-sm text-text-muted">
        No rooms configured yet. Add some on the Rooms &amp; Timings page.
      </p>
    )
  }

  return (
    <div
      className="flex flex-col gap-4 animate-fade-in"
      role="region"
      aria-label="Floor-wise room map"
    >
      {floors.map((floor, i) => (
        <FloorAccordion
          key={floor}
          floor={floor}
          defaultOpen={i === 0}
          crRooms={rooms.filter((r) => r.floor === floor && r.type === 'CR').map((r) => r.name)}
          clRooms={rooms.filter((r) => r.floor === floor && r.type === 'CL').map((r) => r.name)}
          roomSummary={roomSummary}
          occupancy={occupancy}
        />
      ))}
    </div>
  )
}
