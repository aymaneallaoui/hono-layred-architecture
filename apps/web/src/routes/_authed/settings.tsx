import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeading } from '@/components/app-shell'
import { TextField } from '@/components/text-field'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { request } from '@/lib/request'
import { refreshSession, useSession } from '@/lib/session'

const nameSchema = z.object({ name: z.string().trim().min(1, 'Enter a name.').max(200) })

export const Route = createFileRoute('/_authed/settings')({ component: SettingsPage })

function SettingsPage() {
  const { data: session } = useSession()
  const canRename = session?.organization.role !== 'member'

  const profile = useForm({
    resolver: zodResolver(nameSchema),
    values: { name: session?.user.name ?? '' },
  })
  const organization = useForm({
    resolver: zodResolver(nameSchema),
    values: { name: session?.organization.name ?? '' },
  })

  const saveProfile = useMutation({
    mutationFn: (input: { name: string }) =>
      request(() => api.account.profile.$patch({ json: input })),
    onSuccess: async () => {
      await refreshSession()
      toast.success('Profile saved')
    },
  })
  const saveOrganization = useMutation({
    mutationFn: (input: { name: string }) =>
      request(() => api.organizations.current.$patch({ json: input })),
    onSuccess: async () => {
      await refreshSession()
      toast.success('Workspace renamed')
    },
  })
  const resendVerification = useMutation({
    mutationFn: async () => {
      const result = await authClient.sendVerificationEmail({
        email: session?.user.email ?? '',
        callbackURL: '/verify-email',
      })
      if (result.error) throw new Error(result.error.message)
    },
    onSuccess: () => toast.success('Verification email sent'),
  })

  return (
    <>
      <PageHeading title="Settings" />
      <div className="grid gap-8">
        <form
          onSubmit={profile.handleSubmit((values) => saveProfile.mutate(values))}
          noValidate
          aria-labelledby="profile-heading"
          className="grid gap-4 rounded-lg border border-border bg-card p-5"
        >
          <h2 id="profile-heading" className="font-medium">
            Profile
          </h2>
          <TextField
            label="Name"
            className="max-w-sm"
            error={profile.formState.errors.name?.message}
            {...profile.register('name')}
          />
          <p className="text-sm text-muted-foreground">
            {session?.user.email}
            {session?.user.emailVerified ? (
              <span> · verified</span>
            ) : (
              <>
                <span> · not verified. </span>
                <button
                  type="button"
                  className="underline underline-offset-4 hover:text-foreground"
                  disabled={resendVerification.isPending}
                  onClick={() => resendVerification.mutate()}
                >
                  Resend verification email
                </button>
              </>
            )}
          </p>
          <Button type="submit" disabled={saveProfile.isPending} className="w-fit">
            Save profile
          </Button>
        </form>

        {canRename ? (
          <form
            onSubmit={organization.handleSubmit((values) => saveOrganization.mutate(values))}
            noValidate
            aria-labelledby="workspace-heading"
            className="grid gap-4 rounded-lg border border-border bg-card p-5"
          >
            <h2 id="workspace-heading" className="font-medium">
              Workspace
            </h2>
            <TextField
              label="Workspace name"
              className="max-w-sm"
              error={organization.formState.errors.name?.message}
              {...organization.register('name')}
            />
            <Button type="submit" disabled={saveOrganization.isPending} className="w-fit">
              Rename workspace
            </Button>
          </form>
        ) : null}
      </div>
    </>
  )
}
