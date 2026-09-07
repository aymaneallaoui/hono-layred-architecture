import {
  ActionButton,
  EmailHeading,
  EmailLayout,
  Footnote,
  LinkFallback,
  Paragraph,
} from '@/emails/components/layout'
import type { PasswordResetParams } from '@/infra/mail/mailer'

export function ResetPasswordEmail({ name, resetUrl, expiresInMinutes }: PasswordResetParams) {
  return (
    <EmailLayout preview="Reset the password for your account">
      <EmailHeading>Reset your password</EmailHeading>
      <Paragraph>
        Hi {name}, we received a request to reset your password. Choose a new one below.
      </Paragraph>
      <ActionButton href={resetUrl}>Choose a new password</ActionButton>
      <LinkFallback href={resetUrl} />
      <Footnote>
        This link expires in {expiresInMinutes} minutes. If you did not ask for a reset, your
        password stays as it is.
      </Footnote>
    </EmailLayout>
  )
}

ResetPasswordEmail.PreviewProps = {
  name: 'Alex',
  resetUrl: 'https://app.example.com/reset-password?token=preview',
  expiresInMinutes: 60,
} satisfies PasswordResetParams

export default ResetPasswordEmail
