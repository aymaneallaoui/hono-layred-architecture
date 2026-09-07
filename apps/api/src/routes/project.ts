import { createRoute } from '@hono/zod-openapi'

import { json, jsonBody, noContent, sessionSecurity } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { errorResponses as e } from '@/models/error'
import { asId, type ProjectId } from '@/models/ids'
import {
  createProjectBody,
  projectBatchBody,
  projectBatchResult,
  projectListQuery,
  projectPage,
  projectParams,
  projectSchema,
  updateProjectBody,
} from '@/models/project'
import type { RouteDeps } from '@/routes/deps'

const TAGS = ['Projects']

const EDIT = { roles: ['owner', 'admin'] } as const

export const projectRoutes = ({ container, requireAuth }: RouteDeps) => {
  const { projectService } = container
  return createRouter()
    .openapi(
      createRoute({
        method: 'get',
        path: '/',
        tags: TAGS,
        summary: 'Search and page through projects',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        request: { query: projectListQuery },
        responses: { 200: json(projectPage, 'A page of projects'), ...e.base, ...e.validation },
      }),
      async (c) => {
        const page = await projectService.list(c.var.account.organizationId, c.req.valid('query'))
        return c.json(page, 200)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/{id}',
        tags: TAGS,
        summary: 'One project',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        request: { params: projectParams },
        responses: {
          200: json(projectSchema, 'The project'),
          ...e.base,
          ...e.notFound,
          ...e.validation,
        },
      }),
      async (c) => {
        const { id } = c.req.valid('param')
        const project = await projectService.get(c.var.account.organizationId, asId<ProjectId>(id))
        return c.json(project, 200)
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/',
        tags: TAGS,
        summary: 'Create a project',
        middleware: [requireAuth(EDIT)] as const,
        security: sessionSecurity,
        request: { body: jsonBody(createProjectBody) },
        responses: {
          201: json(projectSchema, 'The new project'),
          ...e.base,
          ...e.forbidden,
          ...e.validation,
        },
      }),
      async (c) => {
        const project = await projectService.create(
          c.var.account.organizationId,
          c.req.valid('json'),
        )
        return c.json(project, 201)
      },
    )
    .openapi(
      createRoute({
        method: 'patch',
        path: '/{id}',
        tags: TAGS,
        summary: 'Rename, describe, archive or restore a project',
        middleware: [requireAuth(EDIT)] as const,
        security: sessionSecurity,
        request: { params: projectParams, body: jsonBody(updateProjectBody) },
        responses: {
          200: json(projectSchema, 'The updated project'),
          ...e.base,
          ...e.forbidden,
          ...e.notFound,
          ...e.validation,
        },
      }),
      async (c) => {
        const { id } = c.req.valid('param')
        const project = await projectService.update(
          c.var.account.organizationId,
          asId<ProjectId>(id),
          c.req.valid('json'),
        )
        return c.json(project, 200)
      },
    )
    .openapi(
      createRoute({
        method: 'delete',
        path: '/{id}',
        tags: TAGS,
        summary: 'Delete a project',
        middleware: [requireAuth(EDIT)] as const,
        security: sessionSecurity,
        request: { params: projectParams },
        responses: {
          204: noContent('Project deleted'),
          ...e.base,
          ...e.forbidden,
          ...e.notFound,
          ...e.validation,
        },
      }),
      async (c) => {
        const { id } = c.req.valid('param')
        await projectService.remove(c.var.account.organizationId, asId<ProjectId>(id))
        return c.body(null, 204)
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/delete-batch',
        tags: TAGS,
        summary: 'Delete several projects in one statement',
        middleware: [requireAuth(EDIT)] as const,
        security: sessionSecurity,
        request: { body: jsonBody(projectBatchBody) },
        responses: {
          200: json(projectBatchResult, 'How many were requested and removed'),
          ...e.base,
          ...e.forbidden,
          ...e.validation,
        },
      }),
      async (c) => {
        const { ids } = c.req.valid('json')
        const result = await projectService.removeMany(
          c.var.account.organizationId,
          ids.map((id) => asId<ProjectId>(id)),
        )
        return c.json(result, 200)
      },
    )
}
