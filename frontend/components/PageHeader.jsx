'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Button from './Button'

/**
 * The standard header for every inner page.
 *
 * This markup was previously copy-pasted across four pages, with the back
 * button rendered at three different sizes — so the same control moved and
 * resized as you navigated. One component fixes the position, size and style
 * (Shneiderman 1, consistency; Nielsen 4), and guarantees the back affordance
 * is always in the same place (Norman 7, standardisation).
 *
 * The title is the largest text on the page, establishing a clear visual
 * hierarchy, and `actions` keeps page-level controls grouped top-right
 * (Gestalt proximity).
 */
export default function PageHeader({ title, subtitle, actions, backHref = '/' }) {
  const router = useRouter()

  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          variant="secondary"
          onClick={() => router.push(backHref)}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </Button>

        <div>
          <h1 className="font-display text-2xl font-800 text-text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
