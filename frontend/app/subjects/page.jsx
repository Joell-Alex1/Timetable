'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, BarChart2, Plus, Trash2, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import Navbar from '../../components/Navbar'
import SubjectCard from '../../components/SubjectCard'
import { getTimetable, getSubjects, addSubject, deleteSubject } from '../../lib/api'

/** Derive per-subject scheduled hours from a timetable */
function deriveScheduled(timetable) {
  const theory = {}
  const lab    = {}
  const floors = {}

  if (!timetable) return { theory, lab, floors }

  for (const dayData of Object.values(timetable)) {
    for (const entries of Object.values(dayData)) {
      for (const e of entries) {
        if (e.type === 'Theory') {
          theory[e.subject] = (theory[e.subject] || 0) + 1
        } else if (e.type === 'Lab') {
          lab[e.subject] = (lab[e.subject] || 0) + 1
        }
        if (!floors[e.subject]) floors[e.subject] = []
        floors[e.subject].push(e.floor)
      }
    }
  }
  return { theory, lab, floors }
}

/** Custom Recharts tooltip */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-bright bg-bg-3 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-display font-700 text-text-primary">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-text-secondary">
          {p.name}: <span className="font-mono font-600" style={{ color: p.color }}>{p.value}h</span>
        </p>
      ))}
    </div>
  )
}

/** Skeleton loader */
function SubjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading subjects">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-48 rounded-xl" />
      ))}
    </div>
  )
}

/** Add Subject inline form */
function AddSubjectForm({ onAdd, onCancel }) {
  const [name, setName]           = useState('')
  const [theory, setTheory]       = useState('')
  const [lab, setLab]             = useState('')
  const [batch, setBatch]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const theoryNum = parseInt(theory, 10)
    const labNum    = parseInt(lab, 10)

    if (!name.trim())                      return setFormError('Subject name is required.')
    if (!batch.trim())                     return setFormError('Batch / stream is required.')
    if (isNaN(theoryNum) || theoryNum < 0) return setFormError('Theory hours must be 0 or more.')
    if (isNaN(labNum)    || labNum < 0)    return setFormError('Lab hours must be 0 or more.')
    if (labNum % 2 !== 0)                  return setFormError('Lab hours must be even (sessions are 2 hrs each).')
    if (theoryNum === 0 && labNum === 0)   return setFormError('A subject needs at least 1 theory or lab hour.')

    setSaving(true)
    try {
      const result = await addSubject(name.trim(), theoryNum, labNum, batch.trim())
      onAdd(result.subjects)
    } catch (err) {
      setFormError(err.message || 'Failed to add subject.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-5"
      aria-label="Add new subject"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-sm font-700 text-text-primary">Add Subject</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary cursor-pointer"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-text-muted" htmlFor="subject-name">
            Subject name
          </label>
          <input
            id="subject-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Computer Networks"
            className="
              w-full rounded-lg border border-border-base bg-bg-3 px-3 py-2
              text-sm text-text-primary placeholder:text-text-dim
              focus:outline focus:outline-2 focus:outline-accent
              focus:border-accent/50
            "
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted" htmlFor="batch">
            Batch / stream
          </label>
          <input
            id="batch"
            type="text"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="e.g. CE, IT, Civil"
            className="
              w-full rounded-lg border border-border-base bg-bg-3 px-3 py-2
              text-sm text-text-primary placeholder:text-text-dim
              focus:outline focus:outline-2 focus:outline-accent
              focus:border-accent/50
            "
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted" htmlFor="theory-hours">
            Theory hours / week
          </label>
          <input
            id="theory-hours"
            type="number"
            min="0"
            max="20"
            value={theory}
            onChange={(e) => setTheory(e.target.value)}
            placeholder="e.g. 3"
            className="
              w-full rounded-lg border border-border-base bg-bg-3 px-3 py-2
              text-sm text-text-primary placeholder:text-text-dim
              focus:outline focus:outline-2 focus:outline-accent
              focus:border-accent/50
            "
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted" htmlFor="lab-hours">
            Lab hours / week (even)
          </label>
          <input
            id="lab-hours"
            type="number"
            min="0"
            max="20"
            step="2"
            value={lab}
            onChange={(e) => setLab(e.target.value)}
            placeholder="e.g. 2"
            className="
              w-full rounded-lg border border-border-base bg-bg-3 px-3 py-2
              text-sm text-text-primary placeholder:text-text-dim
              focus:outline focus:outline-2 focus:outline-accent
              focus:border-accent/50
            "
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="
              w-full rounded-lg bg-accent px-4 py-2 text-sm font-600 text-bg-0
              hover:bg-accent/90 disabled:opacity-50 cursor-pointer
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
              transition-all duration-150
            "
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {formError && (
        <p role="alert" className="mt-3 text-xs text-red-400">{formError}</p>
      )}
    </form>
  )
}

export default function SubjectsPage() {
  const router = useRouter()
  const [subjects, setSubjects]   = useState(null)
  const [timetable, setTimetable] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [deleting, setDeleting]   = useState(null)   // name being deleted

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [subs, tt] = await Promise.all([getSubjects(), getTimetable().catch(() => null)])
      setSubjects(subs.subjects)
      setTimetable(tt?.timetable ?? null)
    } catch (err) {
      setError(err.message || 'Failed to load subject data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(name) {
    setDeleting(name)
    try {
      const result = await deleteSubject(name)
      setSubjects(result.subjects)
    } catch (err) {
      // surface briefly via error state
      setError(err.message || 'Failed to delete subject.')
    } finally {
      setDeleting(null)
    }
  }

  const { theory, lab, floors } = deriveScheduled(timetable)

  const chartData = (subjects ?? []).map((s) => ({
    name: s.name.split(' ')[0],
    Theory: theory[s.name] ?? 0,
    Lab:    lab[s.name]    ?? 0,
  }))

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
              <h1 className="font-display text-2xl font-800 text-text-primary">Subject Overview</h1>
              <p className="text-sm text-text-muted">
                {subjects ? `${subjects.length} subjects` : 'Scheduling progress per subject'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              aria-label="Add subject"
              className="
                flex items-center gap-2 rounded-lg border border-accent/30
                bg-accent/10 px-4 py-2 text-sm text-accent
                transition-all duration-150 hover:bg-accent/20 cursor-pointer
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
              "
            >
              <Plus size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Add Subject</span>
            </button>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label="Refresh subjects"
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
        </div>

        {/* Add Subject form */}
        {showForm && (
          <AddSubjectForm
            onAdd={(updated) => { setSubjects(updated); setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-400"
          >
            <span className="font-mono">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto shrink-0 rounded-md border border-red-500/20 px-3 py-1 text-xs hover:bg-red-500/10 cursor-pointer focus-visible:outline focus-visible:outline-accent"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Bar chart */}
        {!loading && subjects && timetable && (
          <section
            className="mb-10 rounded-xl border border-border-base bg-bg-2 p-6 animate-fade-in"
            aria-label="Session hours breakdown chart"
          >
            <div className="mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-accent" aria-hidden="true" />
              <h2 className="font-display text-sm font-700 text-text-primary">
                Scheduled Hours by Subject
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#7D8FA8', fontSize: 11, fontFamily: 'var(--font-jetbrains)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475A72', fontSize: 10, fontFamily: 'var(--font-jetbrains)' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <RechartTooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Legend formatter={(value) => (
                  <span style={{ color: '#7D8FA8', fontSize: 11 }}>{value}</span>
                )} />
                <Bar dataKey="Theory" radius={[3, 3, 0, 0]} fill="#3B82F6" opacity={0.85} />
                <Bar dataKey="Lab"    radius={[3, 3, 0, 0]} fill="#8B5CF6" opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Subject cards */}
        {loading ? (
          <SubjectsSkeleton />
        ) : subjects?.length > 0 ? (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Subject cards"
          >
            {subjects.map((subject, i) => (
              <div key={subject.name} role="listitem" style={{ animationDelay: `${i * 60}ms` }} className="relative group">
                <SubjectCard
                  subject={subject}
                  scheduledTheory={theory[subject.name] ?? 0}
                  scheduledLab={lab[subject.name] ?? 0}
                  floors={floors[subject.name] ?? []}
                  paletteIdx={i}
                />
                {/* Delete button — appears on hover */}
                <button
                  type="button"
                  onClick={() => handleDelete(subject.name)}
                  disabled={deleting === subject.name}
                  aria-label={`Remove ${subject.name}`}
                  className="
                    absolute right-3 top-3 flex h-7 w-7 items-center justify-center
                    rounded-md border border-red-500/20 bg-bg-0/80 text-red-400
                    opacity-0 group-hover:opacity-100 transition-opacity duration-150
                    hover:bg-red-500/15 disabled:opacity-40 cursor-pointer
                    focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400
                  "
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-base bg-bg-2 p-12 text-center">
            <p className="text-text-secondary">No subjects yet.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 cursor-pointer focus-visible:outline focus-visible:outline-accent"
            >
              Add your first subject
            </button>
          </div>
        ) : null}
      </main>
    </div>
  )
}
