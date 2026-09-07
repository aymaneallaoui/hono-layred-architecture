import { env, isTest } from '@/infra/env'
import { childLogger } from '@/infra/logger'
import { CapturingMailer } from '@/infra/mail/capturing-mailer'
import { ConsoleMailer } from '@/infra/mail/console-mailer'
import type { Mailer } from '@/infra/mail/mailer'
import { ResendMailer } from '@/infra/mail/resend-mailer'

export { CapturingMailer } from '@/infra/mail/capturing-mailer'
export type { Mailer } from '@/infra/mail/mailer'

export function selectMailer(): Mailer {
  const logger = childLogger('Mailer')
  if (isTest) return new CapturingMailer()
  if (env.RESEND_API_KEY) {
    return new ResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }, logger)
  }
  return new ConsoleMailer(logger)
}
