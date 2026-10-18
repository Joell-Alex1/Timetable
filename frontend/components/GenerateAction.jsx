'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Lets the navbar run the app's primary action from any page.
 *
 * Generation lives on the dashboard, which owns the loading, failure and
 * toast state. Rather than duplicating that logic, the dashboard registers
 * its handler here and the navbar button calls it — so "Generate" is one
 * target away from every screen instead of requiring a trip home first
 * (Fitts' law; Shneiderman 2, shortcuts for frequent actions).
 *
 * When no handler is registered — any page other than the dashboard — the
 * button falls back to navigating home, so it never silently does nothing.
 */
const GenerateContext = createContext(null)

export function useGenerateAction() {
  return useContext(GenerateContext)
}

export default function GenerateProvider({ children }) {
  const [action, setAction] = useState(null)

  // Stored in a one-element array so a function value is not mistaken for
  // setState's updater form.
  const register = useCallback((handler, loading) => {
    setAction(handler ? { handler, loading } : null)
  }, [])

  const value = useMemo(
    () => ({ register, run: action?.handler ?? null, loading: action?.loading ?? false }),
    [register, action],
  )

  return (
    <GenerateContext.Provider value={value}>{children}</GenerateContext.Provider>
  )
}
