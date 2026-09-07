import { z } from '@hono/zod-openapi'

import type { NotificationId, UserId } from '@/models/ids'
import { cursorPage, cursorQuery } from '@/models/pagination'
import { timestamp, uuid } from '@/models/primitives'

export const NOTIFICATION_TYPES = ['member.joined', 'member.removed'] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const notificationSchema = z
  .object({
    id: uuid,
    type: z.enum(NOTIFICATION_TYPES),
    title: z.string(),
    body: z.string(),
    readAt: timestamp.nullable(),
    createdAt: timestamp,
  })
  .openapi('Notification')

export const notificationPage = cursorPage(notificationSchema).openapi('NotificationPage')
export const notificationListQuery = cursorQuery
export const notificationParams = z.object({ id: uuid })
export const unreadCountSchema = z.object({ unread: z.int() }).openapi('UnreadCount')
export const readAllResult = z.object({ updated: z.int() }).openapi('ReadAllResult')

export type Notification = Omit<z.infer<typeof notificationSchema>, 'id'> & {
  id: NotificationId
  userId: UserId
}
export type NotificationListQuery = z.infer<typeof notificationListQuery>
