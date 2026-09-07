import type { EventBus } from '@/infra/events'
import type { Logger } from '@/infra/logger'
import type { Mailer } from '@/infra/mail'
import { asId, type NotificationId, type UserId } from '@/models/ids'
import type { Notification, NotificationListQuery } from '@/models/notification'
import type { CursorPage } from '@/models/pagination'
import type { IIdentityRepository } from '@/repositories/identity/identity.repository.interface'
import type { INotificationRepository } from '@/repositories/notification/notification.repository.interface'
import type {
  INotificationService,
  NotifyInput,
} from '@/services/notification/notification.service.interface'
import { BaseService } from '@/services/shared/base.service'

const DEFAULT_LIMIT = 20

export class NotificationService extends BaseService implements INotificationService {
  constructor(
    private readonly notifications: INotificationRepository,
    private readonly identity: IIdentityRepository,
    private readonly mailer: Mailer,
    private readonly webUrl: string,
    logger: Logger,
  ) {
    super(logger)
  }

  async notify(input: NotifyInput): Promise<Notification> {
    const notification = await this.notifications.create(input)
    const user = await this.identity.findUserById(input.userId)
    if (user) {
      await this.mailer.sendNotification(user.email, {
        title: input.title,
        body: input.body,
        actionUrl: `${this.webUrl}/notifications`,
      })
    }
    return notification
  }

  list(userId: UserId, query: NotificationListQuery): Promise<CursorPage<Notification>> {
    return this.notifications.listForUser(userId, {
      cursor: query.cursor,
      limit: query.limit ?? DEFAULT_LIMIT,
    })
  }

  unreadCount(userId: UserId): Promise<number> {
    return this.notifications.countUnread(userId)
  }

  async markRead(userId: UserId, id: NotificationId): Promise<void> {
    await this.notifications.markRead(userId, id)
  }

  markAllRead(userId: UserId): Promise<number> {
    return this.notifications.markAllRead(userId)
  }
}

export function registerNotificationSubscribers(
  events: EventBus,
  notifications: INotificationService,
): void {
  events.on('invitation.accepted', async (payload) => {
    if (!payload.invitedBy) return
    await notifications.notify({
      userId: asId<UserId>(payload.invitedBy),
      type: 'member.joined',
      title: `${payload.memberName} joined your organization`,
      body: `${payload.memberName} (${payload.memberEmail}) accepted your invitation.`,
    })
  })
  events.on('member.removed', async (payload) => {
    await notifications.notify({
      userId: asId<UserId>(payload.userId),
      type: 'member.removed',
      title: `You were removed from ${payload.organizationName}`,
      body: `Your membership in ${payload.organizationName} has ended.`,
    })
  })
}
