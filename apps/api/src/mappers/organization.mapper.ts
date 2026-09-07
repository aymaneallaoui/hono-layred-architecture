import { uuidv7 } from 'uuidv7'

import type { NewOrganizationRow, OrganizationRow } from '@/infra/types'
import type { Mapper } from '@/mappers/shared/mapper'
import { asId, type OrganizationId } from '@/models/ids'
import type { Organization } from '@/models/organization'

export class OrganizationMapper {
  static toDomain(row: OrganizationRow): Organization {
    return {
      id: asId<OrganizationId>(row.id),
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  static toDomainList(rows: readonly OrganizationRow[]): Organization[] {
    return rows.map((row) => OrganizationMapper.toDomain(row))
  }

  static toInsertRow(input: { name: string; slug: string }): NewOrganizationRow {
    return { id: uuidv7(), name: input.name, slug: input.slug }
  }
}

OrganizationMapper satisfies Mapper<OrganizationRow, Organization>
