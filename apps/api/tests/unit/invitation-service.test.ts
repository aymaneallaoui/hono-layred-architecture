import { describe, expect, it } from 'bun:test'

import { EventBus } from '@/infra/events'
import { childLogger } from '@/infra/logger'
import { CapturingMailer } from '@/infra/mail'
import type { Account } from '@/models/auth'
import { asId, type InvitationId, type OrganizationId, type UserId } from '@/models/ids'
import type { Invitation } from '@/models/invitation'
import type { Repositories, UnitOfWork } from '@/repositories'
import type { IIdentityRepository } from '@/repositories/identity/identity.repository.interface'
import type { IInvitationRepository } from '@/repositories/invitation/invitation.repository.interface'
import type { IOrganizationRepository } from '@/repositories/organization/organization.repository.interface'
import { InvitationService } from '@/services/invitation/invitation.service'

const ORG = asId<OrganizationId>('11111111-1111-7111-8111-111111111111')
const ACTOR = asId<UserId>('22222222-2222-7222-8222-222222222222')
const INVITE_ID = asId<InvitationId>('33333333-3333-7333-8333-333333333333')

const actor: Account = {
  userId: ACTOR,
  email: 'owner@test.local',
  name: 'Owner',
  emailVerified: true,
  organizationId: ORG,
  role: 'owner',
  sessionId: 's1',
}

function harness(opts: { mailFails?: boolean } = {}) {
  const created: Invitation[] = []
  const deleted: InvitationId[] = []

  const invitations = {
    create: async (input) => {
      const row: Invitation = {
        id: INVITE_ID,
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        invitedBy: input.invitedBy,
        expiresAt: input.expiresAt,
        acceptedAt: null,
        createdAt: new Date(),
      }
      created.push(row)
      return row
    },
    findPendingByEmail: async () => null,
    deleteById: async (_org, id) => {
      deleted.push(id)
      return true
    },
  } as Partial<IInvitationRepository> as IInvitationRepository

  const organizations = {
    findById: async () => ({
      id: ORG,
      name: 'Acme',
      slug: 'acme',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findMember: async () => null,
  } as Partial<IOrganizationRepository> as IOrganizationRepository

  const identity = {
    findUserByEmail: async () => null,
  } as Partial<IIdentityRepository> as IIdentityRepository

  const mailer = new CapturingMailer()
  if (opts.mailFails) {
    mailer.sendOrganizationInvite = async () => {
      throw new Error('smtp down')
    }
  }
  const uow: UnitOfWork = { run: (work) => work({} as Repositories) }

  const service = new InvitationService(
    invitations,
    organizations,
    identity,
    mailer,
    uow,
    new EventBus(childLogger('EventBus')),
    { webUrl: 'https://app.test', ttlDays: 7 },
    childLogger('InvitationService'),
  )
  return { service, created, deleted, mailer }
}

describe('InvitationService.invite', () => {
  it('persists a hashed token, then emails a link carrying the raw token', async () => {
    const { service, created, mailer } = harness()
    const pending = await service.invite(actor, { email: 'New@Test.local', role: 'admin' })

    expect(pending.email).toBe('new@test.local')
    expect(created).toHaveLength(1)
    const mail = mailer.lastFor('new@test.local', 'organization_invite')!
    expect(mail.url.startsWith('https://app.test/accept-invite?token=')).toBe(true)
    expect(mail.url).not.toContain(created[0]!.id)
  })

  it('compensates by deleting the row when delivery fails', async () => {
    const { service, deleted } = harness({ mailFails: true })
    await expect(service.invite(actor, { email: 'x@test.local', role: 'member' })).rejects.toThrow(
      'smtp down',
    )
    expect(deleted).toEqual([INVITE_ID])
  })
})
