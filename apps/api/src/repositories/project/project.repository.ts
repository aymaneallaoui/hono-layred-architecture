import { ProjectMapper } from '@/mappers/project.mapper'
import type { OrganizationId, ProjectId } from '@/models/ids'
import type {
  CreateProjectInput,
  Project,
  ProjectListQuery,
  ProjectPage,
  UpdateProjectInput,
} from '@/models/project'
import type { IProjectRepository } from '@/repositories/project/project.repository.interface'
import { BaseRepository } from '@/repositories/shared/base.repository'
import { escapeLike } from '@/utils/filters'

export class ProjectRepository extends BaseRepository implements IProjectRepository {
  async listForOrg(organizationId: OrganizationId, query: ProjectListQuery): Promise<ProjectPage> {
    const status = query.status ?? 'active'
    const sort = query.sort ?? 'newest'
    const order = query.order ?? (sort === 'name' ? 'asc' : 'desc')

    let base = this.db
      .selectFrom('project')
      .selectAll()
      .where('organization_id', '=', organizationId)

    if (status === 'active') base = base.where('archived_at', 'is', null)
    if (status === 'archived') base = base.where('archived_at', 'is not', null)
    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`
      base = base.where((eb) =>
        eb.or([eb('name', 'ilike', pattern), eb('description', 'ilike', pattern)]),
      )
    }

    base = sort === 'name' ? base.orderBy('name', order) : base.orderBy('created_at', order)
    base = base.orderBy('id', 'asc')

    const { rows, total } = await this.paginate(base, {
      page: query.page ?? 0,
      limit: query.limit ?? 20,
    })
    return { data: ProjectMapper.toDomainList(rows), total }
  }

  async findByIdForOrg(organizationId: OrganizationId, id: ProjectId): Promise<Project | null> {
    const row = await this.db
      .selectFrom('project')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? ProjectMapper.toDomain(row) : null
  }

  async createForOrg(organizationId: OrganizationId, input: CreateProjectInput): Promise<Project> {
    const row = await this.db
      .insertInto('project')
      .values(ProjectMapper.toInsertRow(organizationId, input))
      .returningAll()
      .executeTakeFirstOrThrow()
    return ProjectMapper.toDomain(row)
  }

  async updateForOrg(
    organizationId: OrganizationId,
    id: ProjectId,
    input: UpdateProjectInput,
  ): Promise<Project | null> {
    const update = ProjectMapper.toUpdateRow(input)
    if (Object.keys(update).length === 0) return this.findByIdForOrg(organizationId, id)
    const row = await this.db
      .updateTable('project')
      .set(update)
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()
    return row ? ProjectMapper.toDomain(row) : null
  }

  async removeForOrg(organizationId: OrganizationId, id: ProjectId): Promise<boolean> {
    const result = await this.db
      .deleteFrom('project')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst()
    return Number(result.numDeletedRows) > 0
  }

  async removeManyForOrg(
    organizationId: OrganizationId,
    ids: readonly ProjectId[],
  ): Promise<number> {
    if (ids.length === 0) return 0
    const result = await this.db
      .deleteFrom('project')
      .where('organization_id', '=', organizationId)
      .where('id', 'in', ids)
      .executeTakeFirst()
    return Number(result.numDeletedRows)
  }
}
