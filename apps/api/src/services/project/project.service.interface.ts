import type { OrganizationId, ProjectId } from '@/models/ids'
import type {
  CreateProjectInput,
  Project,
  ProjectListQuery,
  ProjectPage,
  UpdateProjectInput,
} from '@/models/project'

export interface BatchProjectResult {
  requested: number
  removed: number
}

export interface IProjectService {
  list(organizationId: OrganizationId, query: ProjectListQuery): Promise<ProjectPage>
  get(organizationId: OrganizationId, id: ProjectId): Promise<Project>
  create(organizationId: OrganizationId, input: CreateProjectInput): Promise<Project>
  update(organizationId: OrganizationId, id: ProjectId, input: UpdateProjectInput): Promise<Project>
  remove(organizationId: OrganizationId, id: ProjectId): Promise<void>
  removeMany(organizationId: OrganizationId, ids: readonly ProjectId[]): Promise<BatchProjectResult>
}
