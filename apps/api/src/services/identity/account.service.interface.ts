import type { User } from '@/models/auth'
import type { UserId } from '@/models/ids'
import type { UpdateProfileInput } from '@/models/user'

export interface IAccountService {
  updateProfile(userId: UserId, input: UpdateProfileInput): Promise<User>
}
