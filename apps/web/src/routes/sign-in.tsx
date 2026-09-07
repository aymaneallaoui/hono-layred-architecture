import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthLayout } from '@/components/auth-layout'
import { TextField } from '@/components/text-field'
import { authClient, authError } from '@/lib/auth-client'
import { describeError } from '@/lib/errors'
import { ensureSession, refreshSession } from '@/lib/session'

const searchSchema = z.object({ redirect: z.string().optional() })

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const Route = createFileRoute('/sign-in')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (await ensureSession()) throw redirect({ to: search.redirect ?? '/dashboard' })
  },
  component: SignInPage,
})

function SignInPage() {
  const { redirect: next } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    const result = await authClient.signIn.email(values)
    if (result.error) {
      setError(describeError(authError(result.error, 'Could not sign in.')))
      return
    }
    await refreshSession()
    await navigate({ to: next ?? '/dashboard' })
  })

  return (
    <AuthLayout
      title="Sign in"
      lede={
        <>
          New here?{' '}
          <Link to="/sign-up" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
          .
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-5">
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          Sign in
        </Button>
        <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  )
}
