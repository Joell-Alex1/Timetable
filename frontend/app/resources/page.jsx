'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Navbar from '../../components/Navbar'
import {
  getRooms, addRoom, deleteRoom,
  getTimings, addDay, deleteDay, addSlot, deleteSlot,
} from '../../lib/api'

const INPUT_CLASS = `
  h-11 w-full rounded-lg border border-border-base bg-bg-3 px-3
  text-sm text-text-primary placeholder:text-text-dim
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
          flex h-11 w-9 items-center justify-center rounded-r-lg text-text-muted
          hover:text-red-400 cursor-pointer disabled:cursor-not-allowed
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
        <button
          type="submit"
          disabled={saving}
          className="
            flex h-11 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-600 text-bg-0
            hover:bg-accent/90 disabled:opacity-50 cursor-pointer transition-all duration-150
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
          "
        >
          <Plus size={14} aria-hidden="true" />
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>
      {err && <p id={`${id}-err`} role="alert" className="mt-2 text-xs text-red-400">{err}</p>}
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
  const router = useRouter()
  const [rooms, setRooms]     = useState(null)
  const [timings, setTimings] = useState(null)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(null)   // key of the item being removed

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

  async function remove(key, fn, apply) {
    setBusy(key)
    setError(null)
    try {
      apply(await fn())
    } catch (err) {
      setError(err.message || 'Could not remove.')
    } finally {
      setBusy(null)
    }
  }

  const applyTimings = ({ days, slots }) => setTimings({ days, slots })
  const applyRooms   = ({ rooms: r }) => setRooms(r)

  const floors = rooms ? [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b) : []

  return (
    <div className="min-h-dvh bg-bg-0">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            aria-label="Back to dashboard"
            className="
              flex h-11 w-11 items-center justify-center rounded-lg border border-border-base
              bg-bg-2 text-text-secondary transition-all duration-150
              hover:border-border-bright hover:text-text-primary cursor-pointer
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
            "
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-800 text-text-primary">Rooms &amp; Timings</h1>
            <p className="text-sm text-text-muted">
              Saved to the database — the next schedule uses exactly what is listed here.
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
                    onRemove={() => remove(`day:${d}`, () => deleteDay(d), applyTimings)}
                  />
                ))}
              </ul>
              <AddForm
                id="new-day" label="Day name" placeholder="e.g. Saturday"
                onAdd={async (v) => applyTimings(await addDay(v))}
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
                    onRemove={() => remove(`slot:${s}`, () => deleteSlot(s), applyTimings)}
                  />
                ))}
              </ul>
              <AddForm
                id="new-slot" label="Slot label" placeholder="e.g. 17:00"
                onAdd={async (v) => applyTimings(await addSlot(v))}
              />
            </Panel>

            <div className="lg:col-span-2">
              <Panel
                title="Rooms"
                hint="CR### are theory rooms, CL### are lab rooms. The first digit is the floor."
                count={rooms.length}
              >
                <div className="flex flex-col gap-5">
                  {floors.map((floor) => (
                    <div key={floor}>
                      <p className="mb-2 text-[10px] font-600 uppercase tracking-widest text-text-muted">
                        Floor {floor}
                      </p>
                      <ul className="flex flex-wrap gap-2" role="list">
                        {rooms.filter((r) => r.floor === floor).map((r) => (
                          <Chip
                            key={r.name}
                            label={r.name}
                            mono
                            busy={busy === `room:${r.name}`}
                            onRemove={() => remove(`room:${r.name}`, () => deleteRoom(r.name), applyRooms)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                  {floors.length === 0 && (
                    <p className="text-sm text-text-muted">No rooms yet — add one below.</p>
                  )}
                </div>
                <AddForm
                  id="new-room" label="Room code" placeholder="e.g. CR901 or CL902"
                  onAdd={async (v) => applyRooms(await addRoom(v))}
                />
              </Panel>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
