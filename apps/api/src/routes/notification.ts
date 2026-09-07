import { createRoute } from '@hono/zod-openapi'

import { json, noContent, sessionSecurity } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { errorResponses as e } from '@/models/error'
import { asId, type NotificationId } from '@/models/ids'
import {
  notificationListQuery,
  notificationPage,
  notificationParams,
  readAllResult,
  unreadCountSchema,
} from '@/models/notification'
import type { RouteDeps } from '@/routes/deps'

const TAGS = ['Notifications']

export const notificationRoutes = ({ container, requireAuth }: RouteDeps) => {
  const { notificationService } = container
  return createRouter()
    .openapi(
      createRoute({
        method: 'get',
        path: '/',
        tags: TAGS,
        summary: 'Newest notifications first, cursor paged',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        request: { query: notificationListQuery },
        responses: {
          200: json(notificationPage, 'A page of notifications'),
          ...e.base,
          ...e.validation,
        },
      }),
      async (c) => {
        const page = await notificationService.list(c.var.account.userId, c.req.valid('query'))
        return c.json(page, 200)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/unread-count',
        tags: TAGS,
        summary: 'How many notifications are unread',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        responses: { 200: json(unreadCountSchema, 'The unread count'), ...e.base },
      }),
      async (c) => {
        const unread = await notificationService.unreadCount(c.var.account.userId)
        return c.json({ unread }, 200)
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/{id}/read',
        tags: TAGS,
        summary: 'Mark one notification as read',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        request: { params: notificationParams },
        responses: { 204: noContent('Marked as read'), ...e.base, ...e.validation },
      }),
      async (c) => {
        const { id } = c.req.valid('param')
        await notificationService.markRead(c.var.account.userId, asId<NotificationId>(id))
        return c.body(null, 204)
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/read-all',
        tags: TAGS,
        summary: 'Mark every notification as read',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        responses: { 200: json(readAllResult, 'How many were updated'), ...e.base },
      }),
      async (c) => {
        const updated = await notificationService.markAllRead(c.var.account.userId)
        return c.json({ updated }, 200)
      },
    )
}
