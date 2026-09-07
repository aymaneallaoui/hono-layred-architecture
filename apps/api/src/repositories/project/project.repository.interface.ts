import type { OrganizationId, ProjectId } from '@/models/ids'
import type {
  CreateProjectInput,
  Project,
  ProjectListQuery,
  ProjectPage,
  UpdateProjectInput,
} from '@/models/project'

export interface IProjectRepository {
  listForOrg(organizationId: OrganizationId, query: ProjectListQuery): Promise<ProjectPage>
  findByIdForOrg(organizationId: OrganizationId, id: ProjectId): Promise<Project | null>
  createForOrg(organizationId: OrganizationId, input: CreateProjectInput): Promise<Project>
  updateForOrg(
    organizationId: OrganizationId,
    id: ProjectId,
    input: UpdateProjectInput,
  ): Promise<Project | null>
  removeForOrg(organizationId: OrganizationId, id: ProjectId): Promise<boolean>
  removeManyForOrg(organizationId: OrganizationId, ids: readonly ProjectId[]): Promise<number>
}
