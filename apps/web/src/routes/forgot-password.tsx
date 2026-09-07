import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthLayout } from '@/components/auth-layout'
import { TextField } from '@/components/text-field'
import { authClient, authError } from '@/lib/auth-client'
import { describeError } from '@/lib/errors'

const schema = z.object({ email: z.email('Enter a valid email address.') })

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordPage })

function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  const submit = form.handleSubmit(async ({ email }) => {
    setError(null)
    const result = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
    if (result.error) {
      setError(describeError(authError(result.error, 'Could not send the reset email.')))
      return
    }
    setSent(email)
  })

  return (
    <AuthLayout
      title="Reset your password"
      lede={
        sent ? (
          <>If an account exists for {sent}, a reset link is on its way.</>
        ) : (
          <>Enter your email and we will send a link to choose a new password.</>
        )
      }
    >
      {sent ? (
        <Button asChild variant="outline">
          <Link to="/sign-in">Back to sign in</Link>
        </Button>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-5">
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
