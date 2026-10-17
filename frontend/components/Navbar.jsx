"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Building2,
  BookOpen,
  LayoutDashboard,
  DoorOpen,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Timetable", icon: CalendarDays },
  { href: "/floors", label: "Floors", icon: Building2 },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/resources", label: "Rooms & Timings", icon: DoorOpen },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border-dim bg-bg-1/80 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-0 h-14">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-700 tracking-tight text-text-primary leading-none">
            AI Smart Course Scheduler
          </span>
        </div>

        {/* Nav links */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1" role="list">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className={`
                      flex items-center gap-1.5 rounded-md px-3 py-1.5
                      text-sm font-medium transition-all duration-150
                      cursor-pointer focus-visible:outline focus-visible:outline-2
                      focus-visible:outline-accent focus-visible:outline-offset-2
                      ${
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-3"
                      }
                    `}
                  >
                    <Icon
                      size={15}
                      strokeWidth={active ? 2.2 : 1.8}
                      aria-hidden="true"
                    />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
