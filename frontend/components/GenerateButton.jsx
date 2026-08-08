'use client'

import { Cpu, RefreshCw } from 'lucide-react'

export default function GenerateButton({ onClick, loading = false, label = 'Generate Schedule' }) {
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
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
        ${loading
          ? 'bg-accent/20 text-accent/60 cursor-not-allowed'
          : 'bg-accent text-bg-0 hover:bg-accent/90 hover:shadow-glow-md active:scale-[0.98]'
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
