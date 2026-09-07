import { Button } from '@repo/ui/components/button'
import { Toaster } from '@repo/ui/components/sonner'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { queryClient } from '@/lib/query'

export interface RouterContext {
  queryClient: QueryClient
}

const Devtools =
  import.meta.env.DEV && !navigator.webdriver
    ? lazy(() =>
        import('@tanstack/react-router-devtools').then((m) => ({
          default: m.TanStackRouterDevtools,
        })),
      )
    : null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" />
      {Devtools ? (
        <Suspense>
          <Devtools position="bottom-right" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="text-sm text-muted-foreground">That address does not exist.</p>
      <Button asChild variant="outline">
        <Link to="/dashboard">Go to projects</Link>
      </Button>
    </div>
  )
}
