import { Button } from '@repo/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { AuthLayout } from '@/components/auth-layout'
import { describeError } from '@/lib/errors'
import { invitationPreviewQuery, useAcceptInvitation } from '@/lib/queries/team'
import { refreshSession, useSession } from '@/lib/session'

const searchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute('/accept-invite')({
  validateSearch: searchSchema,
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const session = useSession()
  const preview = useQuery({ ...invitationPreviewQuery(token ?? ''), enabled: Boolean(token) })
  const accept = useAcceptInvitation()
  const [error, setError] = useState<string | null>(null)

  if (!token || preview.isError) {
    return (
      <AuthLayout
        title="Invitation not found"
        lede={
          preview.error
            ? describeError(preview.error)
            : 'Open the link from your email to continue.'
        }
      >
        <Button asChild variant="outline">
          <Link to="/sign-in">Go to sign in</Link>
        </Button>
      </AuthLayout>
    )
  }

  if (!preview.data || session.isPending) {
    return <AuthLayout title="Loading invitation" lede="One moment." />
  }

  const invite = preview.data
  const here = `/accept-invite?token=${encodeURIComponent(token)}`

  async function onAccept() {
    setError(null)
    try {
      await accept.mutateAsync(token!)
      await refreshSession()
      await navigate({ to: '/dashboard' })
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <AuthLayout
      title={`Join ${invite.organizationName}`}
      lede={`${invite.inviterName ?? 'A teammate'} invited ${invite.email} to join as ${invite.role}.`}
    >
      {session.data ? (
        <div className="grid gap-4">
          {session.data.user.email.toLowerCase() !== invite.email ? (
            <p className="text-sm text-muted-foreground">
              You are signed in as {session.data.user.email}. Sign in with {invite.email} to accept.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button onClick={() => void onAccept()} disabled={accept.isPending} className="w-fit">
            Accept invitation
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/sign-up" search={{ redirect: here, email: invite.email }}>
              Create an account
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/sign-in" search={{ redirect: here }}>
              I already have one
            </Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
