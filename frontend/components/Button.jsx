'use client'

import { forwardRef } from 'react'

/**
 * The single button in the app.
 *
 * Every button previously carried its own 8-line className, so sizes and
 * colours drifted between screens. One component gives every control of the
 * same kind the same appearance (Gestalt similarity; Shneiderman 1 and
 * Nielsen 4, consistency) and makes the affordance uniform — if it looks like
 * this, it is pressable.
 *
 * All sizes are at least 44px so every control clears the recommended touch
 * target (Fitts' law; ergonomics).
 */

const VARIANTS = {
  // Primary action — one per screen, carries the strongest visual weight.
  primary: `
    bg-accent text-white border border-transparent
    hover:bg-accent-hover hover:text-text-primary hover:shadow-glow-sm active:scale-[0.98]
  `,
  // Default action.
  secondary: `
    bg-bg-2 text-text-secondary border border-border-base
    hover:border-border-bright hover:text-text-primary
  `,
  // Destructive — red is reserved for this and for errors, nothing else.
  danger: `
    bg-status-danger/10 text-status-danger border border-status-danger/30
    hover:bg-status-danger/20
  `,
  // Lowest emphasis, for dismiss/close.
  ghost: `
    bg-transparent text-text-muted border border-transparent
    hover:text-text-primary hover:bg-bg-3
  `,
}

const SIZES = {
  md:   'h-11 px-4 text-sm gap-2',       // 44px — the default
  lg:   'h-12 px-6 text-sm gap-2.5',
  icon: 'h-11 w-11 justify-center',      // 44×44 square
}

const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`
        inline-flex shrink-0 items-center rounded-lg font-600
        transition-all duration-150 cursor-pointer
        disabled:cursor-not-allowed disabled:opacity-50
        focus-visible:outline focus-visible:outline-2
        focus-visible:outline-accent focus-visible:outline-offset-2
        ${VARIANTS[variant] ?? VARIANTS.secondary}
        ${SIZES[size] ?? SIZES.md}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
