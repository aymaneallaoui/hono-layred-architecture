import type { RequestIdVariables } from 'hono/request-id'
import type { TimingVariables } from 'hono/timing'

export type AppEnv = {
  Variables: RequestIdVariables & TimingVariables
}
