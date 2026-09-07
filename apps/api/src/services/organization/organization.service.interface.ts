import type { Account, Role } from '@/models/auth'
import type { OrganizationId, UserId } from '@/models/ids'
import type { Member, Organization, UpdateOrganizationInput } from '@/models/organization'

export interface IOrganizationService {
  get(organizationId: OrganizationId): Promise<Organization>
  update(organizationId: OrganizationId, input: UpdateOrganizationInput): Promise<Organization>
  listMembers(organizationId: OrganizationId): Promise<Member[]>
  updateMemberRole(actor: Account, userId: UserId, role: Role): Promise<Member>
  removeMember(actor: Account, userId: UserId): Promise<void>
}
