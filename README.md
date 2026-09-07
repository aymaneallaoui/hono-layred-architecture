# Hono Starter

A Bun + Turborepo monorepo for a multi-tenant SaaS: a **Hono + Kysely** API with
Better Auth, a **React + TanStack Router** dashboard talking to it over the typed Hono RPC
client, and a **Playwright** suite that drives the real stack. Every external service
degrades to a local default, so the whole thing runs with only Postgres.

```
apps/
  api/   Hono API: auth, organizations, invitations, projects, notifications, emails
  web/   Vite + React 19 + TanStack Router/Query dashboard (hono/client)
  e2e/   Playwright end-to-end tests
packages/
  ui/            @repo/ui: shadcn/ui components on Tailwind v4
  tsconfig/      shared TypeScript bases
  eslint-config/ shared flat ESLint config
```

## Getting started

```bash
bun install
cp .env.example .env            # set BETTER_AUTH_SECRET (32+ chars)
docker compose up -d            # Postgres 17 + Redis 7
bun run db:migrate
bun run dev                     # api http://localhost:3001, web http://localhost:5173
```

Outside production the API serves a Scalar reference at `http://localhost:3001/openapi`
and the raw OpenAPI 3.1 document at `/openapi.json`; `GET /api` and `GET /health` answer
with service status. Emails print to the API log until `RESEND_API_KEY` is set. Preview
the templates with `bun run --filter api email`.

## Commands

| Command                       | What it does                                                 |
| ----------------------------- | ------------------------------------------------------------ |
| `bun run dev`                 | API and web dev servers                                      |
| `bun run typecheck`           | `tsc --noEmit` in every workspace                            |
| `bun run lint`                | ESLint in every workspace                                    |
| `bun run format:check`        | Prettier check                                               |
| `bun run test`                | API unit + integration tests and web unit tests (`bun test`) |
| `bun run e2e`                 | Playwright against a fresh API (:3199) and web (:5199)       |
| `bun run db:migrate`          | Apply Kysely migrations (`db:migrate:up`, `:down`, `:make`)  |
| `bun run build`               | Type-check the API, build the web bundle                     |
| `bun run --filter api routes` | Print the route table (`-- --verbose` includes middleware)   |

The API also ships the [Hono CLI](https://github.com/honojs/cli). With `.env` in place,
`bun run --filter api request /health` sends a request straight through `app.request()`
without starting a server; pass `-X`, `-H`, and `-d` as you would to curl.

## apps/api

Layered, one-way imports: `routes → services → repositories → infra`, with `models`
(Zod schemas + domain errors), `http` (router factory and OpenAPI helpers), and
`middleware` shared sideways.

```
src/
├── app.ts            createApp(container): middleware, Better Auth handler, routes, docs; exports `AppType`
├── container.ts      composition root: db → repositories → services (interfaces are the seam)
├── error-catalog.ts  error code → { status, message }, the single source for every response
├── index.ts          boot: optional migrate-on-start, Bun.serve, graceful shutdown
├── inspect.ts        the app instance the Hono CLI loads; show-routes.ts prints its route table
├── migrate.ts        Kysely migrator (advisory-locked) + `make` scaffold
├── migrations/       migration modules, registered in migrations/index.ts (bundled into the binary)
├── http/             AppEnv (request-scoped variables), createRouter (OpenAPIHono + validation hook),
│                     OpenAPI response helpers and the session security scheme
├── infra/            env (t3-env), db (pg Pool + Kysely), logger (pino), events, auth (Better Auth),
│                     mail/ (Resend | console | capturing), rate-limit/ (Redis | memory)
├── models/           branded ids, Zod schemas registered as OpenAPI components, AppError hierarchy
├── mappers/          row ↔ domain, each `satisfies Mapper<Row, Domain>`
├── repositories/     the only Kysely consumers; BaseRepository.paginate; unit of work
├── services/         business rules; BaseService.assertFound; interfaces per service
├── middleware/       auth guard, rate limit, error + not-found handlers, request logger,
│                     secure headers, SPA serving
├── routes/           thin OpenAPIHono routers: one createRoute per endpoint, chained for RPC
├── emails/           React Email templates + a small theme
└── testing/          seeding helpers used by the Playwright suite
```

**Routes.** Every endpoint is a `createRoute` from `@hono/zod-openapi`: the Zod schemas
validate params, query, and JSON body, type `c.req.valid(...)`, document the endpoint, and
drive the RPC client. Routers are chained (`createRouter().openapi(...).openapi(...)`) and
mounted with `app.route()`, so `AppType` carries every path, input, and status-typed
response to the web app.

**Auth.** Better Auth owns sessions, credentials, verification, and password reset under
`/api/auth/*`, mounted with `app.on(['GET', 'POST'], ...)`. Registration is the one custom
route: it signs up through Better Auth, then seeds the user's organization and owner
membership. The `requireAuth(policy)` middleware resolves the session into a typed
`account` variable (user, active organization, role) and gates routes with
`{ roles, verified }`; routes that use it declare the `session` cookie security scheme.

**Tenancy.** `organization → membership → app_user`. Every repository query is
organization-scoped. Invitations are emailed with a random token; only its SHA-256 hash
is stored. Accepting an invite is one transaction through the unit of work.

**Errors.** Throw an `AppError` subclass anywhere; `onError` maps it (and Hono's
`HTTPException`, including body-limit and content-type failures) to
`{ error: { code, message, details? } }` using the catalog. Zod failures go through the
router's `defaultHook` and become `UNPROCESSABLE` with `[{ path, message }]` details.
Better Auth routes answer in their own `{ code, message }` shape.

**Middleware stack.** `requestId` (echoed as `x-request-id`), `timing` (`Server-Timing`),
a pino request logger, `secureHeaders` (HSTS only in production), `cors` with credentials,
and a 1 MiB `bodyLimit`. Rate limits are per-route middleware keyed by IP (`getConnInfo`
behind `TRUSTED_PROXY_HOPS`), email, or account.

**Events.** A typed in-process `EventBus`. Subscribers never affect the emitting request;
the notification service listens for `invitation.accepted` and `member.removed`, stores an
in-app notification, and mails it.

**Serving the web app.** Set `WEB_DIST_DIR` to the Vite build and the API serves it with
`serveStatic` from `hono/bun`: immutable cache headers for hashed assets, `index.html` for
HTML navigations, JSON 404s for everything else. `apps/api/Dockerfile` builds both apps
into one distroless image with a compiled Bun binary (`bun run --filter api build:server`).
Migrations run at boot in production (`MIGRATE_ON_BOOT`).

**Tests.** `bun test` in `apps/api` migrates a template database once, then clones it per
test (`CREATE DATABASE … TEMPLATE`), so every test owns its data and can assert exact
state. Requests go through `app.request()`; mail is captured, rate limits are in memory.
Unit tests live under `tests/unit`.

## apps/web

- `hc<AppType>` client typed from the API (`src/lib/api.ts`); `request()` unwraps a
  `ClientResponse` into its success body or an `ApiError` with the server's code and
  `Retry-After`. Domain types (`Session`, `Project`, …) are `InferResponseType`s.
- Better Auth React client for sign-in/out, verification, and password reset; the
  session itself is a TanStack Query (`src/lib/session.ts`) that route guards await.
- File-based routes: public auth pages, `_authed` layout guard, dashboard, team,
  notifications, settings. `routeTree.gen.ts` is committed.
- Forms use react-hook-form + zod; server state stays in TanStack Query.

## apps/e2e

Playwright boots the API and web on dedicated ports, seeds data through the API and
the database (`api/testing/e2e-seed`), and asserts on behavior: URLs, HTTP statuses,
and persisted rows. Run `bun run e2e`; `bun run --filter e2e e2e:ui` for the inspector.

## Environment

All apps read the root `.env`; see `.env.example`. Required: `DATABASE_URL`,
`BETTER_AUTH_SECRET`. Optional integrations: `RESEND_API_KEY` (mail), `REDIS_URL`
(shared rate limits), `WEB_DIST_DIR` (serve the SPA from the API).
