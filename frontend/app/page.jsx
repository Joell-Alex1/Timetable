'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Network, Brain, GitBranch, Layers } from 'lucide-react'
import Navbar from '../components/Navbar'
import StatsBar from '../components/StatsBar'
import GenerateButton from '../components/GenerateButton'
import FailureScreen from '../components/FailureScreen'
import { generateSchedule, getTimetable, getUnusedRooms } from '../lib/api'

const CSP_FEATURES = [
  {
    icon: Network,
    title: 'Constraint Satisfaction',
    desc: 'Models scheduling as a CSP — variables (sessions), domains (day/slot/room), and hard constraints that must never be violated.',
  },
  {
    icon: Brain,
    title: 'MRV + Degree Heuristics',
    desc: 'Variable ordering selects the session with the smallest domain first (MRV), breaking ties by most constraints on unassigned neighbours.',
  },
  {
    icon: GitBranch,
    title: 'LCV Value Ordering',
    desc: 'Least Constraining Value orders domain values to maximise options for remaining sessions, combined with soft-constraint scoring.',
  },
  {
    icon: Layers,
    title: 'Forward Checking',
    desc: 'After each assignment, inconsistent values are pruned from neighbour domains immediately — catching dead ends early and enabling fast backtracking.',
  },
]

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading]         = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [failure, setFailure]         = useState(null)
  const [stats, setStats]             = useState(null)
  const [unusedRooms, setUnusedRooms] = useState(null)

  // Load existing stats on mount (if a schedule was already generated)
  useEffect(() => {
    async function loadExisting() {
      try {
        const [tt, ur] = await Promise.all([getTimetable(), getUnusedRooms()])
        setStats(tt.stats)
        setUnusedRooms(ur)
      } catch {
        // No schedule yet — stats remain null
      } finally {
        setStatsLoading(false)
      }
    }
    loadExisting()
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setFailure(null)
    try {
      const result = await generateSchedule()
      if (result.status === 'success') {
        setStats(result.stats)
        setUnusedRooms(result.unused_rooms)
        router.push('/schedule')
      } else {
        setFailure(result.message || 'No valid schedule could be found.')
      }
    } catch (err) {
      setFailure(err.message || 'Failed to connect to the scheduler API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg-0 dot-grid">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-6 py-12">
        {/* Hero */}
        <section
          className="relative mb-12 flex flex-col items-center gap-6 text-center"
          aria-labelledby="hero-heading"
        >
          {/* Glow backdrop */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          </div>

          {/* Course badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/8 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-slow" aria-hidden="true" />
            <span className="font-mono text-xs font-500 text-accent tracking-widest">
              AI Course · Module 4 · CSP
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h1
              id="hero-heading"
              className="font-display text-4xl font-800 leading-tight text-text-primary sm:text-5xl lg:text-6xl"
            >
              AI Smart Course
              <br />
              <span className="text-accent">Scheduler</span>
            </h1>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-text-secondary">
              Generate a conflict-free weekly timetable for NMIMS MPSTME using
              a Constraint Satisfaction Problem solver with backtracking and intelligent heuristics.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <GenerateButton onClick={handleGenerate} loading={loading} />
            <p className="text-xs text-text-muted">
              Solves {'"'}702CO0C032{'"'} — 6 subjects, 60 sessions, 60 rooms
            </p>
          </div>
        </section>

        {/* Failure state */}
        {failure && (
          <div className="mb-10">
            <FailureScreen
              message={failure}
              onRetry={handleGenerate}
              loading={loading}
            />
          </div>
        )}

        {/* Stats bar */}
        <section className="mb-12" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Schedule statistics</h2>
          <StatsBar stats={stats} unusedRooms={unusedRooms} loading={statsLoading} />
        </section>

        {/* CSP feature cards */}
        <section aria-labelledby="algorithm-heading">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border-dim" aria-hidden="true" />
            <h2
              id="algorithm-heading"
              className="font-mono text-xs font-500 uppercase tracking-widest text-text-muted"
            >
              Algorithm Details
            </h2>
            <div className="h-px flex-1 bg-border-dim" aria-hidden="true" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CSP_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <article
                key={title}
                className={`
                  rounded-xl border border-border-base bg-bg-2 p-5
                  transition-all duration-200 hover:border-border-bright hover:bg-bg-3
                  animate-slide-up stagger-${i + 1}
                `}
                style={{ animationFillMode: 'both' }}
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
                  <Icon size={16} className="text-accent" aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 font-display text-sm font-700 text-text-primary">{title}</h3>
                <p className="text-xs leading-relaxed text-text-secondary">{desc}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
