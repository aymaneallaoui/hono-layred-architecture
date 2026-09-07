import type { Logger } from '@/infra/logger'
import { NotFoundError } from '@/models/errors'

export abstract class BaseService {
  constructor(protected readonly logger: Logger) {}

  protected assertFound<T>(value: T | null | undefined, entity: string, id: string): T {
    if (value == null) throw new NotFoundError(entity, id)
    return value
  }
}
