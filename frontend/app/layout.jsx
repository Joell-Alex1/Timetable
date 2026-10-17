import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ToastProvider from '../components/ToastProvider'

// One typeface across the whole UI, matching the reference design's single
// sans. Previously a geometric display face (Syne) sat beside a separate body
// face, which read as two competing voices on the same screen.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata = {
  title: 'AI Smart Course Scheduler — 702CO0C032',
  description:
    'Automated timetable generation using Constraint Satisfaction Problem (CSP) with backtracking, MRV, Degree Heuristic, and LCV.',
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-bg-0 text-text-primary font-body antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
