'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Toast from './Toast'

/**
 * App-wide toast stack.
 *
 * Previously only deletion gave any feedback (via the undo toast) — adding a
 * subject, a room or a time slot succeeded silently, leaving the user to infer
 * from the list that anything had happened. Shneiderman 3 (informative
 * feedback) and 4 (closure) want every action to end with an acknowledgement,
 * so this makes one available to every page from a single hook.
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Subject added.')
 *   toast.undo('Removed “Algorithms”.', async () => { ... })
 */

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

let nextId = 0

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((toast) => {
    const id = ++nextId
    setToasts((list) => [...list, { ...toast, id }])
    return id
  }, [])

  const api = useMemo(() => ({
    push,
    dismiss,
    success: (message, opts) => push({ variant: 'success', message, ...opts }),
    error:   (message, opts) => push({ variant: 'error',   message, duration: 10000, ...opts }),
    info:    (message, opts) => push({ variant: 'info',    message, ...opts }),
    /** A destructive action that stays reversible for a few seconds. */
    undo:    (message, onUndo, opts) =>
      push({ variant: 'info', message, action: { label: 'Undo', onClick: onUndo }, duration: 7000, ...opts }),
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Stack is bottom-centre: close to the thumb on mobile, and out of the
          way of the page header where most actions are triggered. */}
      <div
        className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
