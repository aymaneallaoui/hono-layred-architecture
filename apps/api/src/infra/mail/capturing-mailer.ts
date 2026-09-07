import type {
  EmailVerificationParams,
  Mailer,
  NotificationParams,
  OrganizationInviteParams,
  PasswordResetParams,
} from '@/infra/mail/mailer'

export interface CapturedEmail {
  kind: 'email_verification' | 'password_reset' | 'organization_invite' | 'notification'
  to: string
  url: string
  title?: string
}

export class CapturingMailer implements Mailer {
  readonly outbox: CapturedEmail[] = []
  verifyShouldFail = false

  async sendEmailVerification(to: string, params: EmailVerificationParams): Promise<void> {
    this.outbox.push({ kind: 'email_verification', to, url: params.verifyUrl })
  }

  async sendPasswordReset(to: string, params: PasswordResetParams): Promise<void> {
    this.outbox.push({ kind: 'password_reset', to, url: params.resetUrl })
  }

  async sendOrganizationInvite(to: string, params: OrganizationInviteParams): Promise<void> {
    this.outbox.push({ kind: 'organization_invite', to, url: params.acceptUrl })
  }

  async sendNotification(to: string, params: NotificationParams): Promise<void> {
    this.outbox.push({ kind: 'notification', to, url: params.actionUrl, title: params.title })
  }

  async verify(): Promise<void> {
    if (this.verifyShouldFail) throw new Error('mail transport unavailable')
  }

  lastFor(to: string, kind?: CapturedEmail['kind']): CapturedEmail | undefined {
    return [...this.outbox]
      .reverse()
      .find((email) => email.to === to && (kind === undefined || email.kind === kind))
  }

  clear(): void {
    this.outbox.length = 0
  }
}
