"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Network, Brain, GitBranch, Layers, ChevronDown } from "lucide-react";
import { SUBJECT_PALETTES } from "../lib/palette";
import Navbar from "../components/Navbar";
import WeekPreview from "../components/WeekPreview";
import FloatingSessionCards from "../components/FloatingSessionCards";
import GenerateButton from "../components/GenerateButton";
import FailureScreen from "../components/FailureScreen";
import StaleBanner from "../components/StaleBanner";
import GenerateProgress from "../components/GenerateProgress";
import { useToast } from "../components/ToastProvider";
import { useGenerateAction } from "../components/GenerateAction";
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
    tone: SUBJECT_PALETTES[4], // purple
    title: "Nothing double-booked",
    desc: "A batch is never in two places at once, and no room is used twice in the same hour.",
  },
  {
    icon: Layers,
    tone: SUBJECT_PALETTES[1], // green
    title: "Labs stay in one piece",
    desc: "Every lab gets two back-to-back hours in a lab room, never split across the day.",
  },
  {
    icon: GitBranch,
    tone: SUBJECT_PALETTES[3], // pink
    title: "Spread across the week",
    desc: "A subject’s classes are pushed apart rather than stacked onto a single day.",
  },
  {
    icon: Brain,
    tone: SUBJECT_PALETTES[0], // blue — the app accent, for the fourth card
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
  const [timetable, setTimetable] = useState(null);
  const [timings, setTimings] = useState(null);
  const toast = useToast();
  const generateAction = useGenerateAction();

  // Load existing stats on mount (if a schedule was already generated)
  useEffect(() => {
    async function loadExisting() {
      try {
        const [tt, ur] = await Promise.all([getTimetable(), getUnusedRooms()]);
        setStats(tt.stats);
        setTimetable(tt.timetable); // drives the week preview in the hero
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
  // Expose this page's generate handler to the navbar button.
  useEffect(() => {
    generateAction?.register(handleGenerate, loading);
    return () => generateAction?.register(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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
        setTimings(tms);
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
        setTimetable(result.timetable);
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
    <div className="min-h-dvh bg-bg-0">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-6 py-12">
        {/* Hero — centred, with the real product sitting directly beneath the
            claim it makes. */}
        <section className="relative mb-16" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-3xl text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border-base bg-bg-1 py-1 pl-3 pr-1 shadow-sm">
              <span
                className="h-1.5 w-1.5 rounded-full bg-status-success"
                aria-hidden="true"
              />
              <span className="text-2xs font-600 text-text-primary">
                {stats ? "Schedule ready" : "No schedule yet"}
              </span>
              <span className="rounded-full bg-bg-3 px-2.5 py-1 text-2xs text-text-secondary">
                Built for departments
              </span>
            </div>

            <h1
              id="hero-heading"
              className="mt-7 font-display text-[2.5rem] font-800 leading-[1.08] tracking-tight text-text-primary sm:text-5xl lg:text-[3.5rem]"
            >
              Conflict-free timetables
              <br />
              for your whole department
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              {problem
                ? `Places all ${problem.sessions} sessions for ${problem.subjects} subjects across ` +
                  `${problem.rooms} rooms — no clashes, labs kept whole, done in seconds.`
                : "Places every session across your rooms and hours — no clashes, labs kept whole, done in seconds."}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GenerateButton onClick={handleGenerate} loading={loading} />
              <Link
                href="/schedule"
                className="
                  inline-flex h-[3.25rem] items-center rounded-xl bg-accent-soft px-6
                  font-display text-sm font-700 tracking-wide text-accent
                  transition-colors duration-150 hover:bg-accent-hover/25
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
                  focus-visible:outline-offset-2
                "
              >
                See the timetable
              </Link>
            </div>
          </div>

          {/* The product itself, with real sessions floating around it */}
          <div className="relative mx-auto mt-14 max-w-4xl">
            <FloatingSessionCards timetable={timetable} />
            <WeekPreview
              timetable={timetable}
              days={timings?.days}
              slots={timings?.slots}
            />
          </div>
        </section>

        {/* Key figures, read as one line rather than four competing tiles */}
        <section
          className="mb-14 flex flex-wrap justify-center gap-x-12 gap-y-5 border-y border-border-base py-6"
          aria-label="Schedule statistics"
        >
          {[
            ["Sessions placed", stats?.total_sessions_scheduled],
            ["Subjects set", stats?.subjects_fully_scheduled],
            ["Floors used", stats?.floors_used?.length],
            [
              "Rooms in use",
              problem && unusedRooms ? problem.rooms - unusedRooms.length : undefined,
            ],
          ].map(([label, value]) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-800 text-text-primary tabular-nums">
                {value ?? "—"}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">{label}</p>
            </div>
          ))}
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
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent-soft font-mono text-2xs font-600 text-accent"
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
                    <p className="text-2xs text-text-secondary">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* The stat tiles that used to sit here now live in the hero panel —
            keeping them in both places repeated the same two numbers a few
            hundred pixels apart. */}

        {/* What the schedule guarantees — plain language, outcomes first.
            Sits on the same cream panel as the hero so the page reads as one
            surface rather than two unrelated themes stacked up. */}
        <section
          aria-labelledby="outcomes-heading"
          className="mx-auto max-w-5xl text-center"
        >
          <h2
            id="outcomes-heading"
            className="font-display text-2xl font-800 tracking-tight text-text-primary sm:text-3xl"
          >
            What you get
          </h2>
          <p className="mx-auto mb-8 mt-2 max-w-md text-sm text-text-secondary">
            Hover a card to see what each guarantee means.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OUTCOMES.map(({ icon: Icon, tone, title, desc }, i) => (
              <article
                key={title}
                className={`flip-card h-[180px] animate-slide-up stagger-${i + 1}`}
                style={{ animationFillMode: "both" }}
              >
                <div className="flip-card-inner">
                  {/* Front — the claim */}
                  <div
                    className="
                      flip-card-front flip-card-face flex flex-col justify-center gap-3 rounded-xl
                      border border-border-base bg-bg-1 p-5 text-left shadow-card
                    "
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: tone.bg }}
                    >
                      <Icon
                        size={16}
                        style={{ color: tone.text }}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="font-display text-sm font-700 text-text-primary">
                      {title}
                    </h3>
                  </div>

                  {/* Back — the detail */}
                  <div
                    className="flip-card-back flip-card-face flex items-center rounded-xl p-5 text-left shadow-card"
                    style={{ background: tone.bg }}
                  >
                    <p
                      className="text-2xs leading-relaxed"
                      style={{ color: tone.text }}
                    >
                      {desc}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Progressive disclosure: the technical account is available but
              does not compete with the outcomes above. Native <details> is
              keyboard-accessible and needs no JavaScript. */}
          <details className="group mt-5 rounded-xl border border-border-base bg-bg-1 text-left">
            <summary
              className="
                flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4
                text-sm font-600 text-text-primary transition-colors duration-150
                hover:text-accent
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
                focus-visible:outline-offset-[-2px]
              "
            >
              <span>How it works — the algorithm behind it</span>
              <ChevronDown
                size={16}
                className="shrink-0 text-accent transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>

            <div className="grid gap-4 border-t border-border-base p-5 text-left sm:grid-cols-2">
              {CSP_FEATURES.map(({ title, desc }) => (
                <div key={title}>
                  <h3 className="mb-1 font-display text-sm font-700 text-text-primary">
                    {title}
                  </h3>
                  <p className="text-2xs leading-relaxed text-text-secondary">
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
