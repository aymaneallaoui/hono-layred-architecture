import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely'

export interface Database {
  app_user: UserTable
  session: SessionTable
  account: AccountTable
  verification: VerificationTable
  organization: OrganizationTable
  membership: MembershipTable
  invitation: InvitationTable
  project: ProjectTable
  notification: NotificationTable
}

type Timestamp = ColumnType<Date, Date | string, Date | string>
type NullableTimestamp = ColumnType<Date | null, Date | string | null, Date | string | null>
type TriggerManaged = ColumnType<Date, never, never>

export interface UserTable {
  id: string
  email: string
  name: string
  email_verified: Generated<boolean>
  image: string | null
  tenant_seeded_at: NullableTimestamp
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface SessionTable {
  id: string
  user_id: string
  token: string
  expires_at: Timestamp
  ip_address: string | null
  user_agent: string | null
  active_organization_id: string | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface AccountTable {
  id: string
  user_id: string
  issuer: string
  account_id: string
  provider_id: string
  access_token: string | null
  refresh_token: string | null
  id_token: string | null
  access_token_expires_at: NullableTimestamp
  refresh_token_expires_at: NullableTimestamp
  scope: string | null
  password: string | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface VerificationTable {
  id: string
  identifier: string
  value: string
  expires_at: Timestamp
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface OrganizationTable {
  id: string
  name: string
  slug: string
  created_at: Generated<Date>
  updated_at: TriggerManaged
}

export interface MembershipTable {
  id: string
  organization_id: string
  user_id: string
  role: string
  created_at: Generated<Date>
}

export interface InvitationTable {
  id: string
  organization_id: string
  email: string
  role: string
  token_hash: string
  invited_by: string | null
  expires_at: Timestamp
  accepted_at: NullableTimestamp
  created_at: Generated<Date>
}

export interface ProjectTable {
  id: string
  organization_id: string
  name: string
  description: string | null
  archived_at: NullableTimestamp
  created_at: Generated<Date>
  updated_at: TriggerManaged
}

export interface NotificationTable {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  read_at: NullableTimestamp
  created_at: Generated<Date>
}

export type UserRow = Selectable<UserTable>
export type OrganizationRow = Selectable<OrganizationTable>
export type NewOrganizationRow = Insertable<OrganizationTable>
export type OrganizationRowUpdate = Updateable<OrganizationTable>
export type MembershipRow = Selectable<MembershipTable>
export type NewMembershipRow = Insertable<MembershipTable>
export type InvitationRow = Selectable<InvitationTable>
export type NewInvitationRow = Insertable<InvitationTable>
export type ProjectRow = Selectable<ProjectTable>
export type NewProjectRow = Insertable<ProjectTable>
export type ProjectRowUpdate = Updateable<ProjectTable>
export type NotificationRow = Selectable<NotificationTable>
export type NewNotificationRow = Insertable<NotificationTable>
