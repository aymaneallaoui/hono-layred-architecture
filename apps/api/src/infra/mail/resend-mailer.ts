import { render } from '@react-email/render'
import { createElement, type ReactElement } from 'react'
import { Resend } from 'resend'

import { NotificationEmail } from '@/emails/notification'
import { OrganizationInviteEmail } from '@/emails/organization-invite'
import { ResetPasswordEmail } from '@/emails/reset-password'
import { VerifyEmail } from '@/emails/verify-email'
import type { Logger } from '@/infra/logger'
import type {
  EmailVerificationParams,
  Mailer,
  NotificationParams,
  OrganizationInviteParams,
  PasswordResetParams,
} from '@/infra/mail/mailer'
import { MailDeliveryError } from '@/models/errors'

export interface ResendMailerOptions {
  apiKey: string
  from: string
}

export class ResendMailer implements Mailer {
  private readonly resend: Resend

  constructor(
    private readonly options: ResendMailerOptions,
    private readonly logger: Logger,
  ) {
    this.resend = new Resend(options.apiKey)
  }

  async sendEmailVerification(to: string, params: EmailVerificationParams): Promise<void> {
    await this.deliver(to, 'Verify your email', createElement(VerifyEmail, params), {
      idempotencyKey: `verify-email/${params.verifyUrl}`,
      swallow: true,
    })
  }

  async sendPasswordReset(to: string, params: PasswordResetParams): Promise<void> {
    await this.deliver(to, 'Reset your password', createElement(ResetPasswordEmail, params), {
      idempotencyKey: `reset-password/${params.resetUrl}`,
      swallow: true,
    })
  }

  async sendOrganizationInvite(to: string, params: OrganizationInviteParams): Promise<void> {
    await this.deliver(
      to,
      `You're invited to ${params.organizationName}`,
      createElement(OrganizationInviteEmail, params),
      { idempotencyKey: `organization-invite/${params.acceptUrl}` },
    )
  }

  async sendNotification(to: string, params: NotificationParams): Promise<void> {
    await this.deliver(to, params.title, createElement(NotificationEmail, params), {
      swallow: true,
    })
  }

  async verify(): Promise<void> {
    const { error } = await this.resend.domains.list()
    if (error) throw new Error(error.message)
  }

  private async deliver(
    to: string,
    subject: string,
    element: ReactElement,
    opts: { idempotencyKey?: string; swallow?: boolean } = {},
  ): Promise<void> {
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
    const { error } = await this.resend.emails.send(
      { from: this.options.from, to, subject, html, text },
      opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
    )
    if (!error) return
    this.logger.error({ to, subject, err: error.message }, 'resend delivery failed')
    if (!opts.swallow) throw new MailDeliveryError()
  }
}
