import type { Logger } from '@/infra/logger'
import type { User } from '@/models/auth'
import type { UserId } from '@/models/ids'
import type { UpdateProfileInput } from '@/models/user'
import type { IIdentityRepository } from '@/repositories/identity/identity.repository.interface'
import type { IAccountService } from '@/services/identity/account.service.interface'
import { BaseService } from '@/services/shared/base.service'

export class AccountService extends BaseService implements IAccountService {
  constructor(
    private readonly identity: IIdentityRepository,
    logger: Logger,
  ) {
    super(logger)
  }

  async updateProfile(userId: UserId, input: UpdateProfileInput): Promise<User> {
    return this.assertFound(
      await this.identity.updateUser(userId, { name: input.name.trim() }),
      'User',
      userId,
    )
  }
}
