import type { NotificationId, UserId } from '@/models/ids'
import type { Notification, NotificationListQuery, NotificationType } from '@/models/notification'
import type { CursorPage } from '@/models/pagination'

export interface NotifyInput {
  userId: UserId
  type: NotificationType
  title: string
  body: string
}

export interface INotificationService {
  notify(input: NotifyInput): Promise<Notification>
  list(userId: UserId, query: NotificationListQuery): Promise<CursorPage<Notification>>
  unreadCount(userId: UserId): Promise<number>
  markRead(userId: UserId, id: NotificationId): Promise<void>
  markAllRead(userId: UserId): Promise<number>
}
