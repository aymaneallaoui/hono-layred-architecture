import { NotificationMapper } from '@/mappers/notification.mapper'
import type { NotificationId, UserId } from '@/models/ids'
import type { Notification } from '@/models/notification'
import type { CursorPage } from '@/models/pagination'
import type {
  CreateNotificationRow,
  INotificationRepository,
} from '@/repositories/notification/notification.repository.interface'
import { BaseRepository } from '@/repositories/shared/base.repository'

export class NotificationRepository extends BaseRepository implements INotificationRepository {
  async create(input: CreateNotificationRow): Promise<Notification> {
    const row = await this.db
      .insertInto('notification')
      .values(NotificationMapper.toInsertRow(input))
      .returningAll()
      .executeTakeFirstOrThrow()
    return NotificationMapper.toDomain(row)
  }

  async listForUser(
    userId: UserId,
    opts: { cursor?: string; limit: number },
  ): Promise<CursorPage<Notification>> {
    let query = this.db
      .selectFrom('notification')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('id', 'desc')
      .limit(opts.limit + 1)
    if (opts.cursor) query = query.where('id', '<', opts.cursor)

    const rows = await query.execute()
    const hasMore = rows.length > opts.limit
    const data = NotificationMapper.toDomainList(hasMore ? rows.slice(0, opts.limit) : rows)
    return { data, nextCursor: hasMore ? (data.at(-1)?.id ?? null) : null }
  }

  async countUnread(userId: UserId): Promise<number> {
    const row = await this.db
      .selectFrom('notification')
      .select((eb) => eb.fn.countAll<number>().as('n'))
      .where('user_id', '=', userId)
      .where('read_at', 'is', null)
      .executeTakeFirstOrThrow()
    return Number(row.n)
  }

  async markRead(userId: UserId, id: NotificationId): Promise<boolean> {
    const result = await this.db
      .updateTable('notification')
      .set({ read_at: new Date() })
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .where('read_at', 'is', null)
      .executeTakeFirst()
    return Number(result.numUpdatedRows) > 0
  }

  async markAllRead(userId: UserId): Promise<number> {
    const result = await this.db
      .updateTable('notification')
      .set({ read_at: new Date() })
      .where('user_id', '=', userId)
      .where('read_at', 'is', null)
      .executeTakeFirst()
    return Number(result.numUpdatedRows)
  }
}
