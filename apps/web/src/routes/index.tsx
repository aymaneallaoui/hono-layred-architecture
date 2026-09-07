import { createFileRoute, redirect } from '@tanstack/react-router'

import { ensureSession } from '@/lib/session'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await ensureSession()
    throw redirect({ to: session ? '/dashboard' : '/sign-in' })
  },
})
