import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { AppShell } from '@/components/app-shell'
import { ensureSession, useSession } from '@/lib/session'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const session = await ensureSession()
    if (!session) throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    return { session }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  const { data: session } = useSession()
  const fallback = Route.useRouteContext().session
  return (
    <AppShell session={session ?? fallback}>
      <Outlet />
    </AppShell>
  )
}
