'use client'

import { Cpu, RefreshCw } from 'lucide-react'

export default function GenerateButton({
  onClick,
  loading = false,
  label = 'Generate Schedule',
  // `tone` lets a surface with its own palette (the cream hero) restyle the
  // button without every other caller changing. Default keeps the app accent.
  tone = 'bg-accent hover:bg-accent-hover hover:text-text-primary focus-visible:outline-accent',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={loading ? 'Generating schedule, please wait' : label}
      aria-busy={loading}
      className={`
        group relative inline-flex items-center gap-2.5 overflow-hidden
        rounded-xl px-7 py-3.5 font-display text-sm font-700 tracking-wide
        transition-all duration-200 cursor-pointer
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        ${loading
          ? 'bg-text-muted/30 text-white/70 cursor-not-allowed'
          : `${tone} text-white hover:shadow-glow-md active:scale-[0.98]`
        }
      `}
    >
      {/* Shimmer sweep on hover */}
      {!loading && (
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full"
          aria-hidden="true"
        />
      )}

      {loading ? (
        <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <Cpu size={16} aria-hidden="true" />
      )}

      <span>{loading ? 'Solving CSP…' : label}</span>
    </button>
  )
}
