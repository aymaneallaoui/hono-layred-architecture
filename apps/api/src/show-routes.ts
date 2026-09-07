import { showRoutes } from 'hono/dev'

import app from '@/inspect'

showRoutes(app, { verbose: process.argv.includes('--verbose') })
process.exit(0)
