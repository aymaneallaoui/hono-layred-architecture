import { z } from '@hono/zod-openapi'

import { batchCountResult, batchIds } from '@/models/batch'
import type { OrganizationId, ProjectId } from '@/models/ids'
import { page, pageQuery } from '@/models/pagination'
import { timestamp, uuid } from '@/models/primitives'

export const projectSchema = z
  .object({
    id: uuid,
    organizationId: uuid,
    name: z.string(),
    description: z.string().nullable(),
    archivedAt: timestamp.nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .openapi('Project')

export const createProjectBody = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
  })
  .openapi('CreateProjectInput')

export const updateProjectBody = createProjectBody
  .extend({ archived: z.boolean() })
  .partial()
  .openapi('UpdateProjectInput')

export const projectListQuery = pageQuery.extend({
  q: z.string().max(256).optional(),
  status: z.enum(['all', 'active', 'archived']).optional(),
  sort: z.enum(['newest', 'name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const projectPage = page(projectSchema).openapi('ProjectPage')
export const projectParams = z.object({ id: uuid })
export const projectBatchBody = z.object({ ids: batchIds() }).openapi('ProjectBatchInput')
export const projectBatchResult = batchCountResult({ removed: z.int() }).openapi(
  'ProjectBatchResult',
)

export type Project = Omit<z.infer<typeof projectSchema>, 'id' | 'organizationId'> & {
  id: ProjectId
  organizationId: OrganizationId
}
export type ProjectPage = { data: Project[]; total: number }
export type CreateProjectInput = z.infer<typeof createProjectBody>
export type UpdateProjectInput = z.infer<typeof updateProjectBody>
export type ProjectListQuery = z.infer<typeof projectListQuery>
