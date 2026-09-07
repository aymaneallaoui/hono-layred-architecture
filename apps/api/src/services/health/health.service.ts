import { type Kysely, sql } from 'kysely'

import type { Logger } from '@/infra/logger'
import type { Mailer } from '@/infra/mail'
import type { Database } from '@/infra/types'
import type { ComponentStatus, HealthReport } from '@/models/health'
import { BaseService } from '@/services/shared/base.service'

export interface IHealthService {
  check(): Promise<HealthReport>
}

export class HealthService extends BaseService implements IHealthService {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly mailer: Mailer,
    logger: Logger,
  ) {
    super(logger)
  }

  async check(): Promise<HealthReport> {
    const [database, mail] = await Promise.all([
      this.probe('database', () => sql`select 1`.execute(this.db)),
      this.probe('mail', () => this.mailer.verify()),
    ])
    const status = database === 'down' ? 'unhealthy' : mail === 'down' ? 'degraded' : 'ok'
    return { status, checks: { database, mail } }
  }

  private async probe(name: string, check: () => Promise<unknown>): Promise<ComponentStatus> {
    try {
      await check()
      return 'ok'
    } catch (err) {
      this.logger.warn({ err, component: name }, 'health probe failed')
      return 'down'
    }
  }
}
