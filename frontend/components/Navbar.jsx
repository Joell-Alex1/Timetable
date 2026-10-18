"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import logo from "../public/logo.png";
import { useGenerateAction } from "./GenerateAction";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/schedule", label: "Timetable" },
  { href: "/floors", label: "Floors" },
  { href: "/subjects", label: "Subjects" },
  { href: "/resources", label: "Rooms & Timings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const generate = useGenerateAction();

  // On the dashboard this runs the solver directly; elsewhere it takes the
  // user to the page that owns the action rather than doing nothing.
  const onGenerate = () => {
    if (generate?.run) generate.run();
    else router.push("/");
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border-base bg-bg-1"
      role="banner"
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-6">
        {/* Brand */}
        <Link
          href="/"
          className="
            flex shrink-0 items-center gap-2.5 rounded-lg
            focus-visible:outline focus-visible:outline-2
            focus-visible:outline-accent focus-visible:outline-offset-2
          "
        >
          {/* Decorative: the wordmark beside it already names the app. */}
          <Image
            src={logo}
            alt=""
            aria-hidden="true"
            priority
            className="h-8 w-auto"
          />
          <span className="font-display text-base font-800 tracking-tight text-text-primary">
            AI Smart Course Scheduler
          </span>
        </Link>

        {/* Centred nav. `flex-1` on both sides keeps it centred on the bar
            rather than on whatever space the brand happens to leave. */}
        <nav aria-label="Main navigation" className="flex flex-1 justify-center">
          <ul className="flex items-center gap-1 overflow-x-auto" role="list">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`
                      block whitespace-nowrap rounded-lg px-3.5 py-2
                      text-sm transition-colors duration-150 cursor-pointer
                      focus-visible:outline focus-visible:outline-2
                      focus-visible:outline-accent focus-visible:outline-offset-2
                      ${
                        active
                          ? "bg-bg-3 font-600 text-text-primary"
                          : "text-text-secondary hover:bg-bg-3/70 hover:text-text-primary"
                      }
                    `}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Primary action, reachable from every page */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={generate?.loading}
          className="
            hidden shrink-0 items-center rounded-lg bg-accent px-4 py-2.5
            text-sm font-600 text-white transition-colors duration-150
            hover:bg-accent-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50
            focus-visible:outline focus-visible:outline-2
            focus-visible:outline-accent focus-visible:outline-offset-2
            sm:inline-flex
          "
        >
          {generate?.loading ? "Generating…" : "Generate"}
        </button>
      </div>
    </header>
  );
}
