import { uuidv7 } from 'uuidv7'

import type { NewProjectRow, ProjectRow, ProjectRowUpdate } from '@/infra/types'
import type { Mapper } from '@/mappers/shared/mapper'
import { asId, type OrganizationId, type ProjectId } from '@/models/ids'
import type { CreateProjectInput, Project, UpdateProjectInput } from '@/models/project'

export class ProjectMapper {
  static toDomain(row: ProjectRow): Project {
    return {
      id: asId<ProjectId>(row.id),
      organizationId: asId<OrganizationId>(row.organization_id),
      name: row.name,
      description: row.description,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  static toDomainList(rows: readonly ProjectRow[]): Project[] {
    return rows.map((row) => ProjectMapper.toDomain(row))
  }

  static toInsertRow(organizationId: OrganizationId, input: CreateProjectInput): NewProjectRow {
    return {
      id: uuidv7(),
      organization_id: organizationId,
      name: input.name,
      description: input.description ?? null,
      archived_at: null,
    }
  }

  static toUpdateRow(input: UpdateProjectInput): ProjectRowUpdate {
    const row: ProjectRowUpdate = {}
    if (input.name !== undefined) row.name = input.name
    if (input.description !== undefined) row.description = input.description
    if (input.archived !== undefined) row.archived_at = input.archived ? new Date() : null
    return row
  }
}

ProjectMapper satisfies Mapper<ProjectRow, Project>
