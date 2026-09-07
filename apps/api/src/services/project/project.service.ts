import type { Logger } from '@/infra/logger'
import { NotFoundError } from '@/models/errors'
import type { OrganizationId, ProjectId } from '@/models/ids'
import type {
  CreateProjectInput,
  Project,
  ProjectListQuery,
  ProjectPage,
  UpdateProjectInput,
} from '@/models/project'
import type { IProjectRepository } from '@/repositories/project/project.repository.interface'
import type {
  BatchProjectResult,
  IProjectService,
} from '@/services/project/project.service.interface'
import { BaseService } from '@/services/shared/base.service'

export class ProjectService extends BaseService implements IProjectService {
  constructor(
    private readonly projects: IProjectRepository,
    logger: Logger,
  ) {
    super(logger)
  }

  list(organizationId: OrganizationId, query: ProjectListQuery): Promise<ProjectPage> {
    return this.projects.listForOrg(organizationId, query)
  }

  async get(organizationId: OrganizationId, id: ProjectId): Promise<Project> {
    return this.assertFound(await this.projects.findByIdForOrg(organizationId, id), 'Project', id)
  }

  create(organizationId: OrganizationId, input: CreateProjectInput): Promise<Project> {
    return this.projects.createForOrg(organizationId, { ...input, name: input.name.trim() })
  }

  async update(
    organizationId: OrganizationId,
    id: ProjectId,
    input: UpdateProjectInput,
  ): Promise<Project> {
    return this.assertFound(
      await this.projects.updateForOrg(organizationId, id, input),
      'Project',
      id,
    )
  }

  async remove(organizationId: OrganizationId, id: ProjectId): Promise<void> {
    if (!(await this.projects.removeForOrg(organizationId, id))) {
      throw new NotFoundError('Project', id)
    }
  }

  async removeMany(
    organizationId: OrganizationId,
    ids: readonly ProjectId[],
  ): Promise<BatchProjectResult> {
    const unique = [...new Set(ids)]
    const removed = await this.projects.removeManyForOrg(organizationId, unique)
    return { requested: unique.length, removed }
  }
}
