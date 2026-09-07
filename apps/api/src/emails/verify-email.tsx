import {
  ActionButton,
  EmailHeading,
  EmailLayout,
  Footnote,
  LinkFallback,
  Paragraph,
} from '@/emails/components/layout'
import type { EmailVerificationParams } from '@/infra/mail/mailer'

export function VerifyEmail({ name, verifyUrl, expiresInHours }: EmailVerificationParams) {
  return (
    <EmailLayout preview="Confirm your email address to activate your account">
      <EmailHeading>Verify your email</EmailHeading>
      <Paragraph>
        Hi {name}, thanks for signing up. Confirm this address to activate your account.
      </Paragraph>
      <ActionButton href={verifyUrl}>Verify email</ActionButton>
      <LinkFallback href={verifyUrl} />
      <Footnote>
        This link expires in {expiresInHours} hours. If you did not create an account, you can
        ignore this email.
      </Footnote>
    </EmailLayout>
  )
}

VerifyEmail.PreviewProps = {
  name: 'Alex',
  verifyUrl: 'https://app.example.com/verify-email?token=preview',
  expiresInHours: 24,
} satisfies EmailVerificationParams

export default VerifyEmail
