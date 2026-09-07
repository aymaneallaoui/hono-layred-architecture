import type { Logger } from '@/infra/logger'
import type {
  EmailVerificationParams,
  Mailer,
  NotificationParams,
  OrganizationInviteParams,
  PasswordResetParams,
} from '@/infra/mail/mailer'

export class ConsoleMailer implements Mailer {
  constructor(private readonly logger: Logger) {}

  async sendEmailVerification(to: string, params: EmailVerificationParams): Promise<void> {
    this.logger.info({ to, url: params.verifyUrl }, 'email verification')
  }

  async sendPasswordReset(to: string, params: PasswordResetParams): Promise<void> {
    this.logger.info({ to, url: params.resetUrl }, 'password reset')
  }

  async sendOrganizationInvite(to: string, params: OrganizationInviteParams): Promise<void> {
    this.logger.info(
      { to, organization: params.organizationName, url: params.acceptUrl },
      'organization invite',
    )
  }

  async sendNotification(to: string, params: NotificationParams): Promise<void> {
    this.logger.info({ to, title: params.title }, 'notification')
  }

  async verify(): Promise<void> {}
}
