import type { UserRow } from '@/infra/types'
import type { Mapper } from '@/mappers/shared/mapper'
import type { User } from '@/models/auth'
import { asId, type UserId } from '@/models/ids'

export class UserMapper {
  static toDomain(row: UserRow): User {
    return {
      id: asId<UserId>(row.id),
      email: row.email,
      name: row.name,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
    }
  }

  static toDomainList(rows: readonly UserRow[]): User[] {
    return rows.map((row) => UserMapper.toDomain(row))
  }
}

UserMapper satisfies Mapper<UserRow, User>
