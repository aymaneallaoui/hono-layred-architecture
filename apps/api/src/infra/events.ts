import type { Logger } from '@/infra/logger'

export interface AppEvents {
  'invitation.accepted': {
    organizationId: string
    invitedBy: string | null
    memberName: string
    memberEmail: string
  }
  'member.removed': { organizationId: string; organizationName: string; userId: string }
}

type Handler<K extends keyof AppEvents> = (payload: AppEvents[K]) => Promise<void> | void

export class EventBus {
  private readonly handlers = new Map<
    keyof AppEvents,
    Array<(payload: never) => Promise<void> | void>
  >()

  constructor(private readonly logger: Logger) {}

  on<K extends keyof AppEvents>(event: K, handler: Handler<K>): void {
    const list = this.handlers.get(event) ?? []
    list.push(handler as (payload: never) => Promise<void> | void)
    this.handlers.set(event, list)
  }

  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
    const handlers = this.handlers.get(event)
    if (!handlers) return
    for (const handler of handlers) {
      queueMicrotask(() => {
        void (async () => {
          try {
            await handler(payload as never)
          } catch (err) {
            this.logger.error({ err, event }, 'event subscriber failed')
          }
        })()
      })
    }
  }
}
