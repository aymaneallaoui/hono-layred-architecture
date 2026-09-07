import {
  ActionButton,
  EmailHeading,
  EmailLayout,
  Footnote,
  LinkFallback,
  Paragraph,
} from '@/emails/components/layout'
import type { OrganizationInviteParams } from '@/infra/mail/mailer'

export function OrganizationInviteEmail({
  organizationName,
  inviterName,
  roleName,
  acceptUrl,
  expiresInDays,
}: OrganizationInviteParams) {
  const inviter = inviterName ?? `The ${organizationName} team`
  return (
    <EmailLayout preview={`${inviter} invited you to join ${organizationName}`}>
      <EmailHeading>You are invited to {organizationName}</EmailHeading>
      <Paragraph>
        {inviter} invited you to join <strong>{organizationName}</strong> as{' '}
        <strong>{roleName}</strong>. Accept the invite to get started.
      </Paragraph>
      <ActionButton href={acceptUrl}>Accept invite</ActionButton>
      <LinkFallback href={acceptUrl} />
      <Footnote>
        This invite expires in {expiresInDays} days. If you were not expecting it, you can safely
        ignore this email.
      </Footnote>
    </EmailLayout>
  )
}

OrganizationInviteEmail.PreviewProps = {
  organizationName: 'Acme Studio',
  inviterName: 'Alex',
  roleName: 'admin',
  acceptUrl: 'https://app.example.com/accept-invite?token=preview',
  expiresInDays: 7,
} satisfies OrganizationInviteParams

export default OrganizationInviteEmail
