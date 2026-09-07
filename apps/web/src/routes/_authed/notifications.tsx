import { Button } from '@repo/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/components/empty'
import { cn } from '@repo/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PageHeading } from '@/components/app-shell'
import { notificationsQuery, useMarkAllRead, useMarkRead } from '@/lib/queries/notifications'

export const Route = createFileRoute('/_authed/notifications')({
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationsQuery),
  component: NotificationsPage,
})

function NotificationsPage() {
  const notifications = useQuery(notificationsQuery)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const items = notifications.data?.data ?? []
  const unread = items.filter((n) => !n.readAt).length

  return (
    <>
      <PageHeading
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all as read
            </Button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Nothing yet</EmptyTitle>
            <EmptyDescription>Team activity shows up here and in your inbox.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul
          aria-label="Notifications"
          className="divide-y divide-border rounded-lg border border-border bg-card"
        >
          {items.map((notification) => (
            <li
              key={notification.id}
              className={cn(
                'flex flex-wrap items-start gap-x-6 gap-y-2 px-5 py-4',
                notification.readAt && 'text-muted-foreground',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn('text-foreground', !notification.readAt && 'font-semibold')}>
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground">{notification.body}</p>
              </div>
              <time
                dateTime={String(notification.createdAt)}
                className="text-sm text-muted-foreground tabular-nums"
              >
                {new Date(notification.createdAt).toLocaleDateString()}
              </time>
              {!notification.readAt ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={markRead.isPending}
                  onClick={() => markRead.mutate(notification.id)}
                >
                  Mark as read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
