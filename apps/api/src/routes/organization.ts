import { createRoute } from '@hono/zod-openapi'

import { json, jsonBody, noContent, sessionSecurity } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { env } from '@/infra/env'
import { errorResponses as e } from '@/models/error'
import { asId, type InvitationId, type UserId } from '@/models/ids'
import {
  createInvitationBody,
  invitationParams,
  pendingInvitationList,
  pendingInvitationSchema,
} from '@/models/invitation'
import {
  memberList,
  memberParams,
  memberSchema,
  organizationSchema,
  updateMemberBody,
  updateOrganizationBody,
} from '@/models/organization'
import type { RouteDeps } from '@/routes/deps'

const TAGS = ['Organization']

const MANAGE = { roles: ['owner', 'admin'] } as const
const OWNER = { roles: ['owner'] } as const
const INVITE = { roles: ['owner', 'admin'], verified: true } as const
const INVITE_LIMIT = {
  scope: 'invite',
  by: 'account',
  max: env.RATE_LIMIT_INVITE_MAX,
  windowSeconds: env.RATE_LIMIT_INVITE_WINDOW_SEC,
} as const

export const organizationRoutes = ({ container, requireAuth, rateLimit }: RouteDeps) => {
  const { organizationService, invitationService } = container
  return createRouter()
    .openapi(
      createRoute({
        method: 'get',
        path: '/',
        tags: TAGS,
        summary: 'The active organization',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        responses: {
          200: json(organizationSchema, 'The organization'),
          ...e.base,
          ...e.notFound,
        },
      }),
      async (c) => c.json(await organizationService.get(c.var.account.organizationId), 200),
    )
    .openapi(
      createRoute({
        method: 'patch',
        path: '/',
        tags: TAGS,
        summary: 'Rename the active organization',
        middleware: [requireAuth(MANAGE)] as const,
        security: sessionSecurity,
        request: { body: jsonBody(updateOrganizationBody) },
        responses: {
          200: json(organizationSchema, 'The renamed organization'),
          ...e.base,
          ...e.forbidden,
          ...e.validation,
        },
      }),
      async (c) => {
        const organization = await organizationService.update(
          c.var.account.organizationId,
          c.req.valid('json'),
        )
        return c.json(organization, 200)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/members',
        tags: TAGS,
        summary: 'Members of the active organization',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        responses: { 200: json(memberList, 'Members, oldest first'), ...e.base },
      }),
      async (c) => c.json(await organizationService.listMembers(c.var.account.organizationId), 200),
    )
    .openapi(
      createRoute({
        method: 'patch',
        path: '/members/{userId}',
        tags: TAGS,
        summary: 'Change a member role',
        middleware: [requireAuth(OWNER)] as const,
        security: sessionSecurity,
        request: { params: memberParams, body: jsonBody(updateMemberBody) },
        responses: {
          200: json(memberSchema, 'The member with their new role'),
          ...e.base,
          ...e.forbidden,
          ...e.notFound,
          ...e.conflict,
          ...e.validation,
        },
      }),
      async (c) => {
        const { userId } = c.req.valid('param')
        const { role } = c.req.valid('json')
        const member = await organizationService.updateMemberRole(
          c.var.account,
          asId<UserId>(userId),
          role,
        )
        return c.json(member, 200)
      },
    )
    .openapi(
      createRoute({
        method: 'delete',
        path: '/members/{userId}',
        tags: TAGS,
        summary: 'Remove a member',
        middleware: [requireAuth(MANAGE)] as const,
        security: sessionSecurity,
        request: { params: memberParams },
        responses: {
          204: noContent('Member removed'),
          ...e.base,
          ...e.forbidden,
          ...e.notFound,
          ...e.conflict,
          ...e.validation,
        },
      }),
      async (c) => {
        const { userId } = c.req.valid('param')
        await organizationService.removeMember(c.var.account, asId<UserId>(userId))
        return c.body(null, 204)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/invitations',
        tags: TAGS,
        summary: 'Pending invitations',
        middleware: [requireAuth(MANAGE)] as const,
        security: sessionSecurity,
        responses: {
          200: json(pendingInvitationList, 'Invitations not yet accepted or expired'),
          ...e.base,
          ...e.forbidden,
        },
      }),
      async (c) => c.json(await invitationService.listPending(c.var.account.organizationId), 200),
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/invitations',
        tags: TAGS,
        summary: 'Invite someone by email',
        middleware: [requireAuth(INVITE), rateLimit(INVITE_LIMIT)] as const,
        security: sessionSecurity,
        request: { body: jsonBody(createInvitationBody) },
        responses: {
          201: json(pendingInvitationSchema, 'The invitation, emailed to the invitee'),
          ...e.base,
          ...e.forbidden,
          ...e.notFound,
          ...e.conflict,
          ...e.validation,
          ...e.rateLimited,
          ...e.mail,
        },
      }),
      async (c) => {
        const invitation = await invitationService.invite(c.var.account, c.req.valid('json'))
        return c.json(invitation, 201)
      },
    )
    .openapi(
      createRoute({
        method: 'delete',
        path: '/invitations/{id}',
        tags: TAGS,
        summary: 'Revoke a pending invitation',
        middleware: [requireAuth(MANAGE)] as const,
        security: sessionSecurity,
        request: { params: invitationParams },
        responses: {
          204: noContent('Invitation revoked'),
          ...e.base,
          ...e.forbidden,
          ...e.notFound,
          ...e.validation,
        },
      }),
      async (c) => {
        const { id } = c.req.valid('param')
        await invitationService.revoke(c.var.account.organizationId, asId<InvitationId>(id))
        return c.body(null, 204)
      },
    )
}
