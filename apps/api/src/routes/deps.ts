import type { Container } from '@/container'
import type { AuthMiddleware } from '@/middleware/auth'
import type { RateLimitMiddleware } from '@/middleware/rate-limit'

export interface RouteDeps {
  container: Container
  requireAuth: AuthMiddleware
  rateLimit: RateLimitMiddleware
}
