import type { Kysely, SelectQueryBuilder } from 'kysely'

import type { Logger } from '@/infra/logger'
import type { Database } from '@/infra/types'
import { offsetOf, type PageParams } from '@/models/pagination'

export abstract class BaseRepository {
  constructor(
    protected readonly db: Kysely<Database>,
    protected readonly logger: Logger,
  ) {}

  protected async paginate<DB, TB extends keyof DB, O>(
    base: SelectQueryBuilder<DB, TB, O>,
    page: PageParams,
  ): Promise<{ rows: O[]; total: number }> {
    const rows = await base.limit(page.limit).offset(offsetOf(page)).execute()
    const counted = (await base
      .clearSelect()
      .clearOrderBy()
      .clearLimit()
      .clearOffset()
      .select((eb) => eb.fn.countAll<number>().as('total'))
      .executeTakeFirstOrThrow()) as { total: number | string | bigint }
    return { rows, total: Number(counted.total) }
  }
}
