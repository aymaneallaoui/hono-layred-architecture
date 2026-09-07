import type { Migration } from 'kysely/migration'

import * as initial from './20260829120000_initial'

export const migrations: Record<string, Migration> = {
  '20260829120000_initial': initial,
}
