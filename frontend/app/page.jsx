"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Network, Brain, GitBranch, Layers, ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";
import StatsBar from "../components/StatsBar";
import GenerateButton from "../components/GenerateButton";
import FailureScreen from "../components/FailureScreen";
import StaleBanner from "../components/StaleBanner";
import GenerateProgress from "../components/GenerateProgress";
import { useToast } from "../components/ToastProvider";
import {
  generateSchedule,
  getTimetable,
  getUnusedRooms,
  getSubjects,
  getRooms,
  getTimings,
} from "../lib/api";

/**
 * Outcome-first descriptions, in the user's language rather than the
 * solver's (Nielsen 2, match between system and the real world).
 *
 * The page previously led with "MRV + Degree Heuristics" and "LCV Value
 * Ordering" — accurate, but meaningless to a timetable coordinator, who
 * cares what the result guarantees, not how the search works. The technical
 * description is still available, one click away, for the audience that
 * wants it (progressive disclosure).
 *
 * Each claim here is one the solver actually enforces — see
 * scheduler/constraints.py. Do not add guarantees it does not make.
 */
const OUTCOMES = [
  {
    icon: Network,
    title: "Nothing double-booked",
    desc: "A batch is never in two places at once, and no room is used twice in the same hour.",
  },
  {
    icon: Layers,
    title: "Labs stay in one piece",
    desc: "Every lab gets two back-to-back hours in a lab room, never split across the day.",
  },
  {
    icon: GitBranch,
    title: "Spread across the week",
    desc: "A subject’s classes are pushed apart rather than stacked onto a single day.",
  },
  {
    icon: Brain,
    title: "Rooms shared out",
    desc: "Classes are distributed across floors instead of crowding into the same few rooms.",
  },
];

/** The same system, described for a technical audience. */
const CSP_FEATURES = [
  {
    title: "Constraint Satisfaction",
    desc: "Models scheduling as a CSP — variables (sessions), domains (day/slot/room), and hard constraints that must never be violated.",
  },
  {
    title: "MRV + Degree Heuristics",
    desc: "Variable ordering selects the session with the smallest domain first (MRV), breaking ties by most constraints on unassigned neighbours.",
  },
  {
    title: "LCV Value Ordering",
    desc: "Least Constraining Value orders domain values to maximise options for remaining sessions, combined with soft-constraint scoring.",
  },
  {
    title: "Forward Checking",
    desc: "After each assignment, inconsistent values are pruned from neighbour domains immediately — catching dead ends early and enabling fast backtracking.",
  },
];

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [failure, setFailure] = useState(null);
  const [failureReasons, setFailureReasons] = useState([]);
  const [stats, setStats] = useState(null);
  const [unusedRooms, setUnusedRooms] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [problem, setProblem] = useState(null);
  const toast = useToast();

  // Load existing stats on mount (if a schedule was already generated)
  useEffect(() => {
    async function loadExisting() {
      try {
        const [tt, ur] = await Promise.all([getTimetable(), getUnusedRooms()]);
        setStats(tt.stats);
        setUnusedRooms(ur.unused_rooms); // endpoint wraps the array in an object
      } catch {
        // No schedule yet — stats remain null
      } finally {
        setStatsLoading(false);
      }
    }
    loadExisting();
  }, []);

  // Real problem size, for the progress panel. Fetched separately so a missing
  // timetable (the common first-run case) does not prevent it loading.
  useEffect(() => {
    async function loadProblem() {
      try {
        const [subs, rms, tms] = await Promise.all([
          getSubjects(),
          getRooms(),
          getTimings(),
        ]);
        // One session per theory hour; each lab session covers 2 hours.
        const sessions = subs.subjects.reduce(
          (n, s) => n + s.theory_hours + Math.floor(s.lab_hours / 2),
          0,
        );
        setProblem({
          subjects: subs.subjects.length,
          sessions,
          rooms: rms.rooms.length,
          days: tms.days.length,
          slots: tms.slots.length,
        });
      } catch {
        setProblem(null);
      }
    }
    loadProblem();
  }, [dataVersion]);

  async function handleGenerate() {
    setLoading(true);
    setFailure(null);
    setFailureReasons([]);
    try {
      const result = await generateSchedule();
      if (result.status === "success") {
        setStats(result.stats);
        setUnusedRooms(result.unused_rooms);
        setDataVersion((v) => v + 1);
        toast.success(
          `Timetable generated — ${result.stats.total_sessions_scheduled} sessions across ` +
            `${result.stats.floors_used.length} floor(s).`,
        );
        router.push("/schedule");
      } else {
        setFailure(result.message || "No valid schedule could be found.");
        setFailureReasons(result.reasons ?? []);
      }
    } catch (err) {
      // A 422 carries the solver's diagnosis in the response body; an Error
      // message alone would lose it.
      setFailure(err.message || "Failed to connect to the scheduler API.");
      setFailureReasons(err.body?.reasons ?? []);
    } finally {
      setLoading(false);
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
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-slow"
              aria-hidden="true"
            />
            <span className="font-mono text-xs font-500 text-accent tracking-widest">
              HCI Course
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
              Builds a weekly timetable where no class clashes — every batch,
              room and lab hour is placed automatically.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <GenerateButton onClick={handleGenerate} loading={loading} />
            {/* Built from live data — a hardcoded count goes stale the moment
                anything is edited (Nielsen 1, visibility of system status). */}
            <p className="text-xs text-text-muted">
              {problem
                ? `${problem.subjects} subjects · ${problem.sessions} sessions · ` +
                  `${problem.rooms} rooms · ${problem.days} days × ${problem.slots} slots`
                : "Loading current setup…"}
            </p>
          </div>
        </section>

        {/* Out-of-date warning */}
        <StaleBanner
          refreshKey={dataVersion}
          onRegenerated={() => setDataVersion((v) => v + 1)}
        />

        {/* Progress while the solver runs */}
        {loading && <GenerateProgress problem={problem} />}

        {/* Failure state */}
        {failure && (
          <div className="mb-10">
            <FailureScreen
              message={failure}
              reasons={failureReasons}
              onRetry={handleGenerate}
              loading={loading}
            />
          </div>
        )}

        {/* First-run guidance. An empty dashboard with four "—" tiles tells a
            new user nothing about what to do next (Nielsen 10, help and
            documentation). Disappears once a timetable exists. */}
        {!statsLoading && !stats && !loading && !failure && (
          <section
            className="mb-12 rounded-xl border border-border-base bg-bg-2 p-6 animate-fade-in"
            aria-labelledby="getting-started-heading"
          >
            <h2
              id="getting-started-heading"
              className="mb-4 font-display text-sm font-700 text-text-primary"
            >
              Getting started
            </h2>
            <ol className="flex flex-col gap-3" role="list">
              {[
                [
                  "Check your subjects",
                  "Review the hours and batch for each subject.",
                  "/subjects",
                ],
                [
                  "Check rooms and timings",
                  "Confirm the working days, hour slots and available rooms.",
                  "/resources",
                ],
                [
                  "Generate the timetable",
                  "Press Generate above — the result appears under Timetable.",
                  null,
                ],
              ].map(([title, desc, href], i) => (
                <li key={title} className="flex items-start gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-mono text-2xs font-600 text-accent"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-600 text-text-primary">
                      {href ? (
                        <Link
                          href={href}
                          className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {title}
                        </Link>
                      ) : (
                        title
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Stats bar */}
        <section className="mb-12" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Schedule statistics
          </h2>
          <StatsBar
            stats={stats}
            unusedRooms={unusedRooms}
            loading={statsLoading}
          />
        </section>

        {/* What the schedule guarantees — plain language, outcomes first */}
        <section aria-labelledby="outcomes-heading">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border-dim" aria-hidden="true" />
            <h2
              id="outcomes-heading"
              className="font-mono text-xs font-500 uppercase tracking-widest text-text-muted"
            >
              What you get
            </h2>
            <div className="h-px flex-1 bg-border-dim" aria-hidden="true" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OUTCOMES.map(({ icon: Icon, title, desc }, i) => (
              <article
                key={title}
                className={`
                  rounded-xl border border-border-base bg-bg-2 p-5
                  transition-all duration-200 hover:border-border-bright hover:bg-bg-3
                  animate-slide-up stagger-${i + 1}
                `}
                style={{ animationFillMode: "both" }}
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
                  <Icon size={16} className="text-accent" aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 font-display text-sm font-700 text-text-primary">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-text-secondary">
                  {desc}
                </p>
              </article>
            ))}
          </div>

          {/* Progressive disclosure: the technical account is available but
              does not compete with the outcomes above. Native <details> is
              keyboard-accessible and needs no JavaScript. */}
          <details className="group mt-4 rounded-xl border border-border-base bg-bg-1">
            <summary
              className="
                flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4
                text-sm font-600 text-text-secondary transition-colors duration-150
                hover:text-text-primary
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
                focus-visible:outline-offset-[-2px]
              "
            >
              <span>How it works — the algorithm behind it</span>
              <ChevronDown
                size={16}
                className="shrink-0 transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>

            <div className="grid gap-4 border-t border-border-dim p-5 sm:grid-cols-2">
              {CSP_FEATURES.map(({ title, desc }) => (
                <div key={title}>
                  <h3 className="mb-1 font-display text-sm font-700 text-text-primary">
                    {title}
                  </h3>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
