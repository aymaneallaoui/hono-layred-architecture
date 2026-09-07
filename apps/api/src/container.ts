import { type Auth, createAuth } from '@/infra/auth'
import { connectDb, type DbConnection } from '@/infra/db'
import { corsOrigins, env } from '@/infra/env'
import { EventBus } from '@/infra/events'
import { childLogger } from '@/infra/logger'
import { type Mailer, selectMailer } from '@/infra/mail'
import { type RateLimiter, selectRateLimiter } from '@/infra/rate-limit'
import { createRepositories, createUnitOfWork, type Repositories } from '@/repositories'
import { HealthService, type IHealthService } from '@/services/health/health.service'
import { AccountService } from '@/services/identity/account.service'
import type { IAccountService } from '@/services/identity/account.service.interface'
import { AuthService } from '@/services/identity/auth.service'
import type { IAuthService } from '@/services/identity/auth.service.interface'
import { InvitationService } from '@/services/invitation/invitation.service'
import type { IInvitationService } from '@/services/invitation/invitation.service.interface'
import {
  NotificationService,
  registerNotificationSubscribers,
} from '@/services/notification/notification.service'
import type { INotificationService } from '@/services/notification/notification.service.interface'
import { OrganizationService } from '@/services/organization/organization.service'
import type { IOrganizationService } from '@/services/organization/organization.service.interface'
import { ProjectService } from '@/services/project/project.service'
import type { IProjectService } from '@/services/project/project.service.interface'

export interface ContainerDeps {
  connection?: DbConnection
  mailer?: Mailer
  rateLimiter?: RateLimiter
}

export interface Container {
  connection: DbConnection
  auth: Auth
  mailer: Mailer
  rateLimiter: RateLimiter
  events: EventBus
  repos: Repositories
  authService: IAuthService
  accountService: IAccountService
  organizationService: IOrganizationService
  invitationService: IInvitationService
  projectService: IProjectService
  notificationService: INotificationService
  healthService: IHealthService
  close(): Promise<void>
}

export function createContainer(deps: ContainerDeps = {}): Container {
  const connection = deps.connection ?? connectDb()
  const mailer = deps.mailer ?? selectMailer()
  const rateLimiter = deps.rateLimiter ?? selectRateLimiter()
  const events = new EventBus(childLogger('EventBus'))
  const repos = createRepositories(connection.db)
  const uow = createUnitOfWork(connection.db)
  const auth = createAuth({ pool: connection.pool, mailer, trustedOrigins: corsOrigins })

  const authService = new AuthService(repos.identity, childLogger('AuthService'))
  const accountService = new AccountService(repos.identity, childLogger('AccountService'))
  const organizationService = new OrganizationService(
    repos.organizations,
    events,
    childLogger('OrganizationService'),
  )
  const invitationService = new InvitationService(
    repos.invitations,
    repos.organizations,
    repos.identity,
    mailer,
    uow,
    events,
    { webUrl: env.WEB_URL, ttlDays: env.INVITATION_TTL_DAYS },
    childLogger('InvitationService'),
  )
  const projectService = new ProjectService(repos.projects, childLogger('ProjectService'))
  const notificationService = new NotificationService(
    repos.notifications,
    repos.identity,
    mailer,
    env.WEB_URL,
    childLogger('NotificationService'),
  )
  registerNotificationSubscribers(events, notificationService)
  const healthService = new HealthService(connection.db, mailer, childLogger('HealthService'))

  return {
    connection,
    auth,
    mailer,
    rateLimiter,
    events,
    repos,
    authService,
    accountService,
    organizationService,
    invitationService,
    projectService,
    notificationService,
    healthService,
    close: () => connection.close(),
  }
}
