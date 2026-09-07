import { Button } from '@repo/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu'
import { cn } from '@repo/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Wordmark } from '@/components/wordmark'
import type { Session } from '@/lib/api'
import { unreadCountQuery } from '@/lib/queries/notifications'
import { signOut } from '@/lib/session'

const navLink =
  'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground'

export function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const navigate = useNavigate()
  const unread = useQuery(unreadCountQuery)
  const count = unread.data?.unread ?? 0

  async function onSignOut() {
    await signOut()
    await navigate({ to: '/sign-in' })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
          <Link to="/dashboard" aria-label="Dashboard">
            <Wordmark />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            <Link to="/dashboard" className={navLink}>
              Projects
            </Link>
            <Link to="/team" className={navLink}>
              Team
            </Link>
            <Link to="/notifications" className={cn(navLink, 'flex items-center gap-2')}>
              Notifications
              {count > 0 ? (
                <span
                  aria-label={`${count} unread`}
                  className="rounded-sm bg-primary px-1.5 py-px text-[11px] leading-4 font-semibold text-primary-foreground tabular-nums"
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.organization.name}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Account menu">
                  {session.user.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{session.user.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void onSignOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
