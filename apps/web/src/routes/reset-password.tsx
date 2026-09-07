import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AuthLayout } from '@/components/auth-layout'
import { TextField } from '@/components/text-field'
import { authClient, authError } from '@/lib/auth-client'
import { describeError } from '@/lib/errors'

const searchSchema = z.object({ token: z.string().optional() })
const schema = z.object({ password: z.string().min(8, 'Use at least 8 characters.').max(128) })

export const Route = createFileRoute('/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { password: '' } })

  const submit = form.handleSubmit(async ({ password }) => {
    if (!token) return
    setError(null)
    const result = await authClient.resetPassword({ newPassword: password, token })
    if (result.error) {
      setError(describeError(authError(result.error, 'This reset link is no longer valid.')))
      return
    }
    toast.success('Password updated. Sign in with your new password.')
    await navigate({ to: '/sign-in' })
  })

  if (!token) {
    return (
      <AuthLayout title="Reset link missing" lede="Open the link from your email to continue.">
        <Button asChild variant="outline">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={submit} noValidate className="grid gap-5">
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          Update password
        </Button>
      </form>
    </AuthLayout>
  )
}
