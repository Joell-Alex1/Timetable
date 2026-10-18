'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, BarChart2, Plus, Trash2, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import Navbar from '../../components/Navbar'
import SubjectCard from '../../components/SubjectCard'
import PageHeader from '../../components/PageHeader'
import Button from '../../components/Button'
import Field from '../../components/Field'
import StaleBanner from '../../components/StaleBanner'
import { useToast } from '../../components/ToastProvider'
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
    <div className="rounded-lg border border-border-bright bg-bg-3 px-3 py-2 text-2xs shadow-lg">
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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading subjects">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-48 rounded-xl" />
      ))}
    </div>
  )
}

/** Add Subject inline form */
/**
 * Validate the whole form on every keystroke.
 *
 * Returns { field: message }. Running this continuously (rather than only on
 * submit) lets each field show its own problem next to it as soon as the user
 * has touched it — Shneiderman 5 (prevent errors) and Nielsen 9, instead of a
 * single message appearing at the bottom after the form is already wrong.
 */
function validateSubject({ name, batch, theory, lab }) {
  const errors = {}
  const theoryNum = parseInt(theory, 10)
  const labNum    = parseInt(lab, 10)

  if (!name.trim())  errors.name  = 'Give the subject a name.'
  if (!batch.trim()) errors.batch = 'Which batch takes this subject?'

  if (theory === '' || isNaN(theoryNum) || theoryNum < 0) {
    errors.theory = 'Enter 0 or more hours.'
  }
  if (lab === '' || isNaN(labNum) || labNum < 0) {
    errors.lab = 'Enter 0 or more hours.'
  } else if (labNum % 2 !== 0) {
    errors.lab = `Use an even number — ${labNum - 1 > 0 ? labNum - 1 : 2} or ${labNum + 1}, since each lab is 2 hours.`
  }

  if (!errors.theory && !errors.lab && theoryNum === 0 && labNum === 0) {
    errors.theory = 'A subject needs at least one theory or lab hour.'
  }

  return errors
}

function AddSubjectForm({ onAdd, onCancel }) {
  const [name, setName]           = useState('')
  const [theory, setTheory]       = useState('')
  const [lab, setLab]             = useState('')
  const [batch, setBatch]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)
  // Show a field's error only once the user has engaged with it, so the form
  // does not open covered in red before anything has been typed.
  const [touched, setTouched]     = useState({})

  const errors = validateSubject({ name, batch, theory, lab })
  const isValid = Object.keys(errors).length === 0
  const show = (field) => (touched[field] ? errors[field] : undefined)
  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    if (!isValid) {
      // Reveal every outstanding problem at once rather than one at a time.
      setTouched({ name: true, batch: true, theory: true, lab: true })
      return
    }

    setSaving(true)
    try {
      const result = await addSubject(
        name.trim(), parseInt(theory, 10), parseInt(lab, 10), batch.trim(),
      )
      onAdd(result.subjects, name.trim())
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
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel">
          <X size={14} aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          className="sm:col-span-2"
          id="subject-name"
          label="Subject name"
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => markTouched('name')}
          error={show('name')}
          placeholder="e.g. Computer Networks"
        />

        <Field
          id="batch"
          label="Batch / stream"
          hint="Groups that cannot share a time slot."
          required
          type="text"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          onBlur={() => markTouched('batch')}
          error={show('batch')}
          placeholder="e.g. CE, IT, Civil"
        />

        <Field
          id="theory-hours"
          label="Theory hours / week"
          hint="Each hour becomes one 1-hour session."
          type="number"
          min="0"
          max="20"
          value={theory}
          onChange={(e) => setTheory(e.target.value)}
          onBlur={() => markTouched('theory')}
          error={show('theory')}
          placeholder="e.g. 3"
        />

        <Field
          id="lab-hours"
          label="Lab hours / week"
          hint="Must be even — each lab runs for 2 consecutive hours."
          type="number"
          min="0"
          max="20"
          step="2"
          value={lab}
          onChange={(e) => setLab(e.target.value)}
          onBlur={() => markTouched('lab')}
          error={show('lab')}
          placeholder="e.g. 2"
        />

        <div className="flex items-end">
          <Button
            type="submit"
            variant="primary"
            disabled={saving || !isValid}
            title={isValid ? undefined : 'Fill in the fields above first'}
            className="w-full justify-center"
          >
            {saving ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>

      {formError && (
        <p role="alert" className="mt-3 text-2xs text-status-danger">{formError}</p>
      )}
    </form>
  )
}

export default function SubjectsPage() {
  const [subjects, setSubjects]   = useState(null)
  const [timetable, setTimetable] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [deleting, setDeleting]   = useState(null)   // name being deleted
  const [dataVersion, setDataVersion] = useState(0)  // bumped on every edit
  const toast = useToast()

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
      setDataVersion((v) => v + 1)
      // The server returns the full deleted record, so undo can re-create it
      // exactly — hours and batch included, not just the name.
      const r = result.restore
      toast.undo(`Removed “${name}”.`, async () => {
        try {
          const back = await addSubject(r.name, r.theory_hours, r.lab_hours, r.batch)
          setSubjects(back.subjects)
          setDataVersion((v) => v + 1)
          toast.success(`Restored “${r.name}”.`)
        } catch (err) {
          toast.error(err.message || 'Could not restore the subject.')
        }
      })
    } catch (err) {
      toast.error(err.message || 'Failed to delete subject.')
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
        <PageHeader
          title="Subject Overview"
          subtitle={subjects ? `${subjects.length} subjects` : 'Scheduling progress per subject'}
          actions={
            <>
              <Button
                variant="primary"
                onClick={() => setShowForm((v) => !v)}
                aria-expanded={showForm}
                aria-label="Add subject"
              >
                <Plus size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Add Subject</span>
              </Button>

              <Button onClick={load} disabled={loading} aria-label="Refresh subjects">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </>
          }
        />

        {/* Out-of-date warning — editing subjects invalidates the timetable */}
        <StaleBanner
          refreshKey={dataVersion}
          onRegenerated={() => setDataVersion((v) => v + 1)}
        />

        {/* Add Subject form */}
        {showForm && (
          <AddSubjectForm
            onAdd={(updated, name) => {
              setSubjects(updated)
              setShowForm(false)
              setDataVersion((v) => v + 1)
              toast.success(`Added “${name}”.`)
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger"
          >
            <span>{error}</span>
            <Button variant="danger" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        )}

        {/* Bar chart */}
        {!loading && subjects && timetable && (
          <section
            className="mb-10 rounded-xl border border-border-base bg-bg-2 px-6 pb-4 pt-5 animate-fade-in"
            aria-label="Session hours breakdown chart"
          >
            <div className="mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-accent" aria-hidden="true" />
              <h2 className="font-display text-sm font-700 text-text-primary">
                Scheduled Hours by Subject
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={chartData} barCategoryGap="28%" barGap={3} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#555148', fontSize: 11, fontFamily: 'var(--font-jetbrains)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#676357', fontSize: 11, fontFamily: 'var(--font-jetbrains)' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <RechartTooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'rgba(52, 47, 40, 0.05)' }}
                />
                <Legend formatter={(value) => (
                  <span style={{ color: '#555148', fontSize: 11 }}>{value}</span>
                )} />
                <Bar dataKey="Theory" radius={[3, 3, 0, 0]} maxBarSize={26} fill="#34483A" />
                <Bar dataKey="Lab"    radius={[3, 3, 0, 0]} maxBarSize={26} fill="#9B7B60" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Subject cards */}
        {loading ? (
          <SubjectsSkeleton />
        ) : subjects?.length > 0 ? (
          <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Subject cards"
          >
            {subjects.map((subject, i) => (
              <div key={subject.name} role="listitem" style={{ animationDelay: `${i * 60}ms` }}>
                <SubjectCard
                  subject={subject}
                  scheduledTheory={theory[subject.name] ?? 0}
                  scheduledLab={lab[subject.name] ?? 0}
                  floors={floors[subject.name] ?? []}
                  paletteIdx={i}
                  onDelete={() => handleDelete(subject.name)}
                  deleting={deleting === subject.name}
                />
                {/* Delete button — appears on hover */}
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-base bg-bg-2 p-12 text-center">
            <p className="text-text-secondary">No subjects yet.</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Add your first subject
            </Button>
          </div>
        ) : null}
      </main>

    </div>
  )
}
