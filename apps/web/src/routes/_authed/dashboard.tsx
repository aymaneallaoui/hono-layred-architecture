import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@repo/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/components/empty'
import { Input } from '@repo/ui/components/input'
import { cn } from '@repo/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeading } from '@/components/app-shell'
import { TextField } from '@/components/text-field'
import type { Project } from '@/lib/api'
import {
  projectsQuery,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from '@/lib/queries/projects'
import { useSession } from '@/lib/session'

const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).optional(),
  page: z.number().int().min(0).optional(),
})

const createSchema = z.object({
  name: z.string().trim().min(1, 'Give the project a name.').max(200),
  description: z.string().trim().max(2000).optional(),
})

export const Route = createFileRoute('/_authed/dashboard')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(projectsQuery(deps)),
  component: DashboardPage,
})

const STATUSES = [
  ['active', 'Active'],
  ['archived', 'Archived'],
  ['all', 'All'],
] as const

function DashboardPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: session } = useSession()
  const canEdit = session?.organization.role !== 'member'
  const projects = useQuery(projectsQuery(search))
  const status = search.status ?? 'active'

  return (
    <>
      <PageHeading
        title="Projects"
        description={
          projects.data ? `${projects.data.total} in ${session?.organization.name}` : undefined
        }
      />

      {canEdit ? <CreateProjectForm /> : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Search projects"
          placeholder="Search projects"
          defaultValue={search.q ?? ''}
          className="max-w-xs"
          onChange={(event) =>
            void navigate({
              search: (prev) => ({ ...prev, q: event.target.value || undefined, page: undefined }),
              replace: true,
            })
          }
        />
        <div role="group" aria-label="Filter by status" className="flex rounded-md bg-muted p-0.5">
          {STATUSES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() =>
                void navigate({ search: (prev) => ({ ...prev, status: value, page: undefined }) })
              }
              className={cn(
                'rounded-[5px] px-3 py-1 text-sm text-muted-foreground transition-colors',
                status === value && 'bg-card text-foreground shadow-xs',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ProjectList projects={projects.data?.data ?? []} canEdit={canEdit} />

      {projects.data && projects.data.total > 20 ? (
        <div className="mt-6 flex items-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={(search.page ?? 0) === 0}
            onClick={() =>
              void navigate({ search: (prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }) })
            }
          >
            Previous
          </Button>
          <span className="text-muted-foreground tabular-nums">
            Page {(search.page ?? 0) + 1} of {Math.ceil(projects.data.total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={((search.page ?? 0) + 1) * 20 >= projects.data.total}
            onClick={() =>
              void navigate({ search: (prev) => ({ ...prev, page: (prev.page ?? 0) + 1 }) })
            }
          >
            Next
          </Button>
        </div>
      ) : null}
    </>
  )
}

function CreateProjectForm() {
  const create = useCreateProject()
  const form = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', description: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    await create.mutateAsync({ name: values.name, description: values.description || undefined })
    form.reset()
    toast.success(`Created ${values.name}`)
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="New project"
      className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-[1fr_1.5fr_auto] sm:items-start"
    >
      <TextField
        label="Project name"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />
      <TextField
        label="Description"
        error={form.formState.errors.description?.message}
        {...form.register('description')}
      />
      <Button type="submit" disabled={create.isPending} className="sm:mt-[22px]">
        Create project
      </Button>
    </form>
  )
}

function ProjectList({ projects, canEdit }: { projects: Project[]; canEdit: boolean }) {
  const update = useUpdateProject()
  const remove = useDeleteProject()

  if (projects.length === 0) {
    return (
      <Empty className="mt-6 border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle>No projects here</EmptyTitle>
          <EmptyDescription>
            {canEdit ? 'Create the first one above.' : 'Nothing matches this filter yet.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul
      aria-label="Projects"
      className="mt-6 divide-y divide-border rounded-lg border border-border bg-card"
    >
      {projects.map((project) => (
        <li key={project.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{project.name}</p>
            {project.description ? (
              <p className="truncate text-sm text-muted-foreground">{project.description}</p>
            ) : null}
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {project.archivedAt ? 'Archived' : new Date(project.createdAt).toLocaleDateString()}
          </span>
          {canEdit ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={update.isPending}
                onClick={() => update.mutate({ id: project.id, archived: !project.archivedAt })}
              >
                {project.archivedAt ? 'Restore' : 'Archive'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(project.id)}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
