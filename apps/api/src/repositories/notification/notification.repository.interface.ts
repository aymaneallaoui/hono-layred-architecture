import type { NotificationId, UserId } from '@/models/ids'
import type { Notification, NotificationType } from '@/models/notification'
import type { CursorPage } from '@/models/pagination'

export interface CreateNotificationRow {
  userId: UserId
  type: NotificationType
  title: string
  body: string
}

export interface INotificationRepository {
  create(input: CreateNotificationRow): Promise<Notification>
  listForUser(
    userId: UserId,
    opts: { cursor?: string; limit: number },
  ): Promise<CursorPage<Notification>>
  countUnread(userId: UserId): Promise<number>
  markRead(userId: UserId, id: NotificationId): Promise<boolean>
  markAllRead(userId: UserId): Promise<number>
}
