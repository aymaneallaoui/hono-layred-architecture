declare const brand: unique symbol
export type Brand<T, B extends string> = T & { readonly [brand]: B }

export type UserId = Brand<string, 'UserId'>
export type OrganizationId = Brand<string, 'OrganizationId'>
export type MembershipId = Brand<string, 'MembershipId'>
export type InvitationId = Brand<string, 'InvitationId'>
export type ProjectId = Brand<string, 'ProjectId'>
export type NotificationId = Brand<string, 'NotificationId'>

export const asId = <B extends Brand<string, string>>(value: string): B => value as B
