import { Button } from '@repo/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'

import { AuthLayout } from '@/components/auth-layout'
import { authClient } from '@/lib/auth-client'
import { refreshSession } from '@/lib/session'

const searchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute('/verify-email')({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token } = Route.useSearch()
  const verification = useQuery({
    queryKey: ['verify-email', token],
    queryFn: async () => {
      const result = await authClient.verifyEmail({ query: { token: token ?? '' } })
      if (result.error) throw new Error(result.error.message ?? 'Verification failed.')
      await refreshSession()
      return true
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  })

  const state = !token
    ? { title: 'Verification link missing', lede: 'Open the link from your email to continue.' }
    : verification.isPending
      ? { title: 'Verifying your email', lede: 'One moment.' }
      : verification.isError
        ? {
            title: 'This link has expired',
            lede: 'Sign in and request a new verification email from settings.',
          }
        : { title: 'Email verified', lede: 'Your address is confirmed. You can sign in now.' }

  return (
    <AuthLayout title={state.title} lede={state.lede}>
      {verification.isPending && token ? null : (
        <Button asChild>
          <Link to="/sign-in">Continue to sign in</Link>
        </Button>
      )}
    </AuthLayout>
  )
}
