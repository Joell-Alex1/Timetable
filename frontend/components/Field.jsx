'use client'

import { useId } from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * A labelled form field: label, optional hint, input, and error message.
 *
 * Bundling these together means the three things that must always travel
 * together actually do:
 *   - a real <label htmlFor>, so the label is announced and clicking it
 *     focuses the input (also a bigger hit area — Fitts' law);
 *   - a hint that states the rule *before* the user breaks it, rather than
 *     only on submit (Norman 1, knowledge in the world);
 *   - an error wired up via aria-describedby and aria-invalid, so screen
 *     readers get it rather than only sighted users (Nielsen 9).
 *
 * The error is shown with an icon as well as red text — colour alone is not
 * a reliable signal for colour-blind users.
 */
export default function Field({
  label,
  hint,
  error,
  required = false,
  className = '',
  inputClassName = '',
  id: providedId,
  ...inputProps
}) {
  const autoId  = useId()
  const id      = providedId ?? autoId
  const hintId  = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-500 text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-status-danger" aria-hidden="true">*</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-2xs leading-snug text-text-muted">
          {hint}
        </p>
      )}

      <input
        id={id}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`
          h-11 w-full rounded-lg border bg-bg-3 px-3 text-sm text-text-primary
          placeholder:text-text-muted transition-colors duration-150
          focus:outline focus:outline-2 focus:outline-accent
          ${error ? 'border-status-danger/60' : 'border-border-base focus:border-accent/50'}
          ${inputClassName}
        `}
        {...inputProps}
      />

      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-2xs text-status-danger">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
