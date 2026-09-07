import type { Kysely } from 'kysely'

import { childLogger } from '@/infra/logger'
import type { Database } from '@/infra/types'
import { IdentityRepository } from '@/repositories/identity/identity.repository'
import type { IIdentityRepository } from '@/repositories/identity/identity.repository.interface'
import { InvitationRepository } from '@/repositories/invitation/invitation.repository'
import type { IInvitationRepository } from '@/repositories/invitation/invitation.repository.interface'
import { NotificationRepository } from '@/repositories/notification/notification.repository'
import type { INotificationRepository } from '@/repositories/notification/notification.repository.interface'
import { OrganizationRepository } from '@/repositories/organization/organization.repository'
import type { IOrganizationRepository } from '@/repositories/organization/organization.repository.interface'
import { ProjectRepository } from '@/repositories/project/project.repository'
import type { IProjectRepository } from '@/repositories/project/project.repository.interface'

export interface Repositories {
  identity: IIdentityRepository
  organizations: IOrganizationRepository
  invitations: IInvitationRepository
  projects: IProjectRepository
  notifications: INotificationRepository
}

export interface UnitOfWork {
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>
}

export function createRepositories(db: Kysely<Database>): Repositories {
  return {
    identity: new IdentityRepository(db, childLogger('IdentityRepository')),
    organizations: new OrganizationRepository(db, childLogger('OrganizationRepository')),
    invitations: new InvitationRepository(db, childLogger('InvitationRepository')),
    projects: new ProjectRepository(db, childLogger('ProjectRepository')),
    notifications: new NotificationRepository(db, childLogger('NotificationRepository')),
  }
}

export function createUnitOfWork(db: Kysely<Database>): UnitOfWork {
  return {
    run: (work) => db.transaction().execute((trx) => work(createRepositories(trx))),
  }
}
