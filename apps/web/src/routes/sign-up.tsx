import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthLayout } from '@/components/auth-layout'
import { TextField } from '@/components/text-field'
import { api } from '@/lib/api'
import { describeError } from '@/lib/errors'
import { request } from '@/lib/request'
import { ensureSession, refreshSession } from '@/lib/session'

const searchSchema = z.object({ redirect: z.string().optional(), email: z.string().optional() })

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(200),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
  organizationName: z.string().trim().max(200).optional(),
})

export const Route = createFileRoute('/sign-up')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (await ensureSession()) throw redirect({ to: search.redirect ?? '/dashboard' })
  },
  component: SignUpPage,
})

function SignUpPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: search.email ?? '', password: '', organizationName: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await request(() =>
        api.auth.register.$post({
          json: { ...values, organizationName: values.organizationName || undefined },
        }),
      )
      await refreshSession()
      await navigate({ to: search.redirect ?? '/dashboard' })
    } catch (err) {
      setError(describeError(err))
    }
  })

  return (
    <AuthLayout
      title="Create your account"
      lede={
        <>
          Already have one?{' '}
          <Link to="/sign-in" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
          .
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-5">
        <TextField
          label="Name"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
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
          autoComplete="new-password"
          hint="At least 8 characters."
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <TextField
          label="Workspace name"
          hint="Optional. Defaults to a workspace named after you."
          error={form.formState.errors.organizationName?.message}
          {...form.register('organizationName')}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
