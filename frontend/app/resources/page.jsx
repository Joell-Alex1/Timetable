'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Search } from 'lucide-react'
import Navbar from '../../components/Navbar'
import PageHeader from '../../components/PageHeader'
import Button from '../../components/Button'
import StaleBanner from '../../components/StaleBanner'
import { useToast } from '../../components/ToastProvider'
import {
  getRooms, addRoom, deleteRoom,
  getTimings, addDay, deleteDay, addSlot, deleteSlot,
} from '../../lib/api'

const INPUT_CLASS = `
  h-11 w-full rounded-lg border border-border-base bg-bg-3 px-3
  text-sm text-text-primary placeholder:text-text-muted
  focus:outline focus:outline-2 focus:outline-accent focus:border-accent/50
`

/** A removable pill — the whole delete target is 44px tall for touch. */
function Chip({ label, mono = false, busy, onRemove }) {
  return (
    <li
      className={`
        flex items-center gap-1 rounded-lg border border-border-base bg-bg-3
        pl-3 text-sm text-text-primary transition-opacity duration-150
        ${busy ? 'opacity-40' : ''}
      `}
    >
      <span className={mono ? 'font-mono text-xs' : ''}>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        aria-label={`Remove ${label}`}
        className="
          flex h-11 w-11 items-center justify-center rounded-r-lg text-text-muted
          hover:text-status-danger cursor-pointer disabled:cursor-not-allowed
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
        "
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  )
}

/** Inline "type a value, press Add" form. */
function AddForm({ id, label, placeholder, onAdd }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!value.trim()) return setErr(`${label} is required.`)
    setSaving(true)
    setErr(null)
    try {
      await onAdd(value.trim())
      setValue('')
    } catch (error) {
      setErr(error.message || 'Could not add.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4" aria-label={`Add ${label.toLowerCase()}`}>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={id} className="sr-only">{label}</label>
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className={INPUT_CLASS}
            aria-invalid={err ? 'true' : undefined}
            aria-describedby={err ? `${id}-err` : undefined}
          />
        </div>
        <Button type="submit" variant="primary" disabled={saving}>
          <Plus size={14} aria-hidden="true" />
          {saving ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {err && <p id={`${id}-err`} role="alert" className="mt-2 text-xs text-status-danger">{err}</p>}
    </form>
  )
}

function Panel({ title, hint, count, children }) {
  return (
    <section className="rounded-xl border border-border-base bg-bg-2 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-700 text-text-primary">{title}</h2>
          <p className="text-xs text-text-muted">{hint}</p>
        </div>
        {count != null && (
          <span className="font-mono text-xs text-text-muted">{count}</span>
        )}
      </div>
      {children}
    </section>
  )
}

export default function ResourcesPage() {
  const [rooms, setRooms]     = useState(null)
  const [timings, setTimings] = useState(null)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(null)   // key of the item being removed
  const [dataVersion, setDataVersion] = useState(0)  // bumped on every edit
  const [roomQuery, setRoomQuery] = useState('')
  const toast = useToast()

  async function load() {
    setError(null)
    try {
      const [rm, tm] = await Promise.all([getRooms(), getTimings()])
      setRooms(rm.rooms)
      setTimings(tm)
    } catch (err) {
      setError(err.message || 'Failed to load rooms and timings.')
    }
  }

  useEffect(() => { load() }, [])

  /**
   * Delete something, then keep it recoverable for a few seconds.
   *
   * `restoreFn` receives the server's `restore` payload, which carries the
   * original position — re-adding a day or slot without it would append to
   * the end and silently reorder the week.
   */
  async function remove(key, label, fn, apply, restoreFn) {
    setBusy(key)
    setError(null)
    try {
      const result = await fn()
      apply(result)
      setDataVersion((v) => v + 1)
      toast.undo(`Removed “${label}”.`, async () => {
        try {
          apply(await restoreFn(result.restore))
          setDataVersion((v) => v + 1)
          toast.success(`Restored “${label}”.`)
        } catch (err) {
          toast.error(err.message || 'Could not restore.')
        }
      })
    } catch (err) {
      toast.error(err.message || 'Could not remove.')
    } finally {
      setBusy(null)
    }
  }

  const applyTimings = ({ days, slots }) => setTimings({ days, slots })
  const applyRooms   = ({ rooms: r }) => setRooms(r)

  const floors = rooms ? [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b) : []

  // Match on room code; a bare number matches the floor too, so "7" finds floor 7.
  const q = roomQuery.trim().toUpperCase()
  const visibleRooms = (rooms ?? []).filter((r) => !q || r.name.includes(q))
  const visibleFloors = floors.filter((f) => visibleRooms.some((r) => r.floor === f))

  return (
    <div className="min-h-dvh bg-bg-0">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <PageHeader
          title="Rooms & Timings"
          subtitle="Saved to the database — the next schedule uses exactly what is listed here."
        />

        {/* Editing rooms or timings invalidates the saved timetable */}
        <StaleBanner
          refreshKey={dataVersion}
          onRegenerated={() => setDataVersion((v) => v + 1)}
        />

        {error && (
          <p role="alert" className="mb-6 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
            {error}
          </p>
        )}

        {!rooms || !timings ? (
          !error && (
            <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading rooms and timings">
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-72 rounded-xl lg:col-span-2" />
            </div>
          )
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 animate-fade-in">
            <Panel title="Days" hint="Working days, in the order shown." count={timings.days.length}>
              <ul className="flex flex-wrap gap-2" role="list">
                {timings.days.map((d) => (
                  <Chip
                    key={d}
                    label={d}
                    busy={busy === `day:${d}`}
                    onRemove={() => remove(
                      `day:${d}`, d, () => deleteDay(d), applyTimings,
                      (r) => addDay(r.name, r.position),
                    )}
                  />
                ))}
              </ul>
              <AddForm
                id="new-day" label="Day name" placeholder="e.g. Saturday"
                onAdd={async (v) => { applyTimings(await addDay(v)); setDataVersion((n) => n + 1); toast.success(`Added “${v}”.`) }}
              />
            </Panel>

            <Panel
              title="Time slots"
              hint="One-hour slots, in order. A new slot goes after the last one; labs need two neighbouring slots."
              count={timings.slots.length}
            >
              <ul className="flex flex-wrap gap-2" role="list">
                {timings.slots.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    mono
                    busy={busy === `slot:${s}`}
                    onRemove={() => remove(
                      `slot:${s}`, s, () => deleteSlot(s), applyTimings,
                      (r) => addSlot(r.label, r.position),
                    )}
                  />
                ))}
              </ul>
              <AddForm
                id="new-slot" label="Slot label" placeholder="e.g. 17:00"
                onAdd={async (v) => { applyTimings(await addSlot(v)); setDataVersion((n) => n + 1); toast.success(`Added slot “${v}”.`) }}
              />
            </Panel>

            <div className="lg:col-span-2">
              <Panel
                title="Rooms"
                hint="CR### are theory rooms, CL### are lab rooms. The first digit is the floor."
                count={roomQuery ? `${visibleRooms.length} of ${rooms.length}` : rooms.length}
              >
                {/* Sixty chips is far more than anyone can scan. Filtering lets
                    the user recognise a room rather than hunt for it
                    (Shneiderman 8; Nielsen 6, recognition over recall). */}
                <div className="mb-4 flex items-center gap-2">
                  <Search size={15} className="shrink-0 text-text-muted" aria-hidden="true" />
                  <label htmlFor="room-filter" className="sr-only">Filter rooms</label>
                  <input
                    id="room-filter"
                    type="search"
                    value={roomQuery}
                    onChange={(e) => setRoomQuery(e.target.value)}
                    placeholder="Filter rooms — try CL or 70"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="flex flex-col gap-5">
                  {visibleFloors.map((floor) => (
                    <div key={floor}>
                      <p className="mb-2 text-2xs font-600 uppercase tracking-widest text-text-muted">
                        Floor {floor}
                      </p>
                      <ul className="flex flex-wrap gap-2" role="list">
                        {visibleRooms.filter((r) => r.floor === floor).map((r) => (
                          <Chip
                            key={r.name}
                            label={r.name}
                            mono
                            busy={busy === `room:${r.name}`}
                            onRemove={() => remove(
                              `room:${r.name}`, r.name, () => deleteRoom(r.name), applyRooms,
                              () => addRoom(r.name),
                            )}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                  {floors.length === 0 && (
                    <p className="text-sm text-text-muted">No rooms yet — add one below.</p>
                  )}
                  {floors.length > 0 && visibleFloors.length === 0 && (
                    <p className="text-sm text-text-muted">
                      No room matches “{roomQuery}”. Clear the filter to see all {rooms.length}.
                    </p>
                  )}
                </div>
                <AddForm
                  id="new-room" label="Room code" placeholder="e.g. CR901 or CL902"
                  onAdd={async (v) => { applyRooms(await addRoom(v)); setDataVersion((n) => n + 1); toast.success(`Added room “${v.toUpperCase()}”.`) }}
                />
              </Panel>
            </div>
          </div>
        )}
      </main>

    </div>
  )
}
