import { uuidv7 } from 'uuidv7'

import type { NewNotificationRow, NotificationRow } from '@/infra/types'
import type { Mapper } from '@/mappers/shared/mapper'
import { asId, type NotificationId, type UserId } from '@/models/ids'
import type { Notification, NotificationType } from '@/models/notification'

export class NotificationMapper {
  static toDomain(row: NotificationRow): Notification {
    return {
      id: asId<NotificationId>(row.id),
      userId: asId<UserId>(row.user_id),
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      readAt: row.read_at,
      createdAt: row.created_at,
    }
  }

  static toDomainList(rows: readonly NotificationRow[]): Notification[] {
    return rows.map((row) => NotificationMapper.toDomain(row))
  }

  static toInsertRow(input: {
    userId: UserId
    type: NotificationType
    title: string
    body: string
  }): NewNotificationRow {
    return {
      id: uuidv7(),
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      read_at: null,
    }
  }
}

NotificationMapper satisfies Mapper<NotificationRow, Notification>
