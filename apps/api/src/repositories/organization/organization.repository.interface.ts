import type { Role } from '@/models/auth'
import type { OrganizationId, UserId } from '@/models/ids'
import type { Member, Organization, UpdateOrganizationInput } from '@/models/organization'

export interface IOrganizationRepository {
  findById(id: OrganizationId): Promise<Organization | null>
  update(id: OrganizationId, input: UpdateOrganizationInput): Promise<Organization | null>
  listMembers(organizationId: OrganizationId): Promise<Member[]>
  findMember(organizationId: OrganizationId, userId: UserId): Promise<Member | null>
  countOwners(organizationId: OrganizationId): Promise<number>
  addMember(organizationId: OrganizationId, userId: UserId, role: Role): Promise<void>
  updateMemberRole(organizationId: OrganizationId, userId: UserId, role: Role): Promise<boolean>
  removeMember(organizationId: OrganizationId, userId: UserId): Promise<boolean>
}
