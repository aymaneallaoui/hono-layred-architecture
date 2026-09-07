export interface EmailVerificationParams {
  name: string
  verifyUrl: string
  expiresInHours: number
}

export interface PasswordResetParams {
  name: string
  resetUrl: string
  expiresInMinutes: number
}

export interface OrganizationInviteParams {
  organizationName: string
  inviterName: string | null
  roleName: string
  acceptUrl: string
  expiresInDays: number
}

export interface NotificationParams {
  title: string
  body: string
  actionUrl: string
}

export interface Mailer {
  sendEmailVerification(to: string, params: EmailVerificationParams): Promise<void>
  sendPasswordReset(to: string, params: PasswordResetParams): Promise<void>
  sendOrganizationInvite(to: string, params: OrganizationInviteParams): Promise<void>
  sendNotification(to: string, params: NotificationParams): Promise<void>
  verify(): Promise<void>
}
