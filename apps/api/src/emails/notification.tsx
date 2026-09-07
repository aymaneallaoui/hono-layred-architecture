import { ActionButton, EmailHeading, EmailLayout, Paragraph } from '@/emails/components/layout'
import type { NotificationParams } from '@/infra/mail/mailer'

export function NotificationEmail({ title, body, actionUrl }: NotificationParams) {
  return (
    <EmailLayout preview={body}>
      <EmailHeading>{title}</EmailHeading>
      <Paragraph>{body}</Paragraph>
      <ActionButton href={actionUrl}>Open dashboard</ActionButton>
    </EmailLayout>
  )
}

NotificationEmail.PreviewProps = {
  title: 'Alex joined Acme Studio',
  body: 'Alex accepted your invitation and is now a member of Acme Studio.',
  actionUrl: 'https://app.example.com/notifications',
} satisfies NotificationParams

export default NotificationEmail
