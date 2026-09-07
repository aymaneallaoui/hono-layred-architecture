import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { Label } from '@repo/ui/components/label'
import { NativeSelect, NativeSelectOption } from '@repo/ui/components/native-select'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeading } from '@/components/app-shell'
import { TextField } from '@/components/text-field'
import {
  invitationsQuery,
  membersQuery,
  useInvite,
  useRemoveMember,
  useRevokeInvitation,
} from '@/lib/queries/team'
import { useSession } from '@/lib/session'

const inviteSchema = z.object({
  email: z.email('Enter a valid email address.'),
  role: z.enum(['member', 'admin']),
})

export const Route = createFileRoute('/_authed/team')({
  loader: ({ context }) => context.queryClient.ensureQueryData(membersQuery),
  component: TeamPage,
})

function TeamPage() {
  const { data: session } = useSession()
  const role = session?.organization.role ?? 'member'
  const canManage = role !== 'member'
  const members = useQuery(membersQuery)
  const invitations = useQuery({ ...invitationsQuery, enabled: canManage })
  const remove = useRemoveMember()
  const revoke = useRevokeInvitation()

  return (
    <>
      <PageHeading title="Team" description={session?.organization.name} />

      {canManage ? <InviteForm /> : null}

      <section aria-labelledby="members-heading" className="mt-8">
        <h2 id="members-heading" className="mb-3 text-sm font-medium text-muted-foreground">
          Members
        </h2>
        <ul
          aria-label="Members"
          className="divide-y divide-border rounded-lg border border-border bg-card"
        >
          {(members.data ?? []).map((member) => {
            const isSelf = member.userId === session?.user.id
            const removable = canManage && !isSelf && (role === 'owner' || member.role !== 'owner')
            return (
              <li
                key={member.userId}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {member.name}
                    {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                </div>
                <span className="text-sm text-muted-foreground capitalize">{member.role}</span>
                {removable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(member.userId)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      {canManage && invitations.data && invitations.data.length > 0 ? (
        <section aria-labelledby="pending-heading" className="mt-8">
          <h2 id="pending-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            Pending invitations
          </h2>
          <ul
            aria-label="Pending invitations"
            className="divide-y divide-border rounded-lg border border-border bg-card"
          >
            {invitations.data.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4"
              >
                <p className="min-w-0 flex-1 truncate text-foreground">{invitation.email}</p>
                <span className="text-sm text-muted-foreground capitalize">{invitation.role}</span>
                <span className="text-sm text-muted-foreground">
                  Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(invitation.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

function InviteForm() {
  const invite = useInvite()
  const form = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member' as const },
  })

  const submit = form.handleSubmit(async (values) => {
    await invite.mutateAsync(values)
    form.reset()
    toast.success(`Invitation sent to ${values.email}`)
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Invite a teammate"
      className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-[1.5fr_1fr_auto] sm:items-start"
    >
      <TextField
        label="Email address"
        type="email"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <div className="grid gap-2">
        <Label htmlFor="invite-role">Role</Label>
        <NativeSelect id="invite-role" {...form.register('role')}>
          <NativeSelectOption value="member">Member</NativeSelectOption>
          <NativeSelectOption value="admin">Admin</NativeSelectOption>
        </NativeSelect>
      </div>
      <Button type="submit" disabled={invite.isPending} className="sm:mt-[22px]">
        Send invitation
      </Button>
    </form>
  )
}
