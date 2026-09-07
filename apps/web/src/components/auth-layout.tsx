import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Wordmark } from '@/components/wordmark'

export function AuthLayout({
  title,
  lede,
  children,
}: {
  title: string
  lede?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="flex flex-col justify-between border-b border-border px-6 py-8 sm:px-10 lg:border-r lg:border-b-0 lg:px-14 lg:py-12">
        <Link to="/" className="w-fit">
          <Wordmark size="lg" />
        </Link>
        <p className="mt-10 max-w-sm text-base leading-relaxed text-muted-foreground lg:mt-0">
          One workspace per team. Sessions, invitations, and projects wired end to end so you can
          start on the part that is yours.
        </p>
      </aside>
      <main className="flex items-center px-6 py-12 sm:px-10 lg:px-20">
        <div className="w-full max-w-md">
          <h1 className="font-display text-4xl text-foreground">{title}</h1>
          {lede ? <p className="mt-3 text-sm text-muted-foreground">{lede}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
