import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    create or replace function set_updated_at() returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql
  `.execute(db)

  await db.schema
    .createTable('app_user')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('email_verified', 'boolean', (c) => c.notNull().defaultTo(false))
    .addColumn('image', 'text')
    .addColumn('tenant_seeded_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('organization')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('slug', 'text', (c) => c.notNull().unique())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await sql`
    create trigger organization_set_updated_at
    before update on organization for each row execute function set_updated_at()
  `.execute(db)

  await db.schema
    .createTable('session')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('user_id', 'uuid', (c) => c.notNull().references('app_user.id').onDelete('cascade'))
    .addColumn('token', 'text', (c) => c.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('ip_address', 'text')
    .addColumn('user_agent', 'text')
    .addColumn('active_organization_id', 'uuid', (c) =>
      c.references('organization.id').onDelete('set null'),
    )
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema.createIndex('session_user_idx').on('session').column('user_id').execute()
  await db.schema.createIndex('session_expires_idx').on('session').column('expires_at').execute()

  await db.schema
    .createTable('account')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('user_id', 'uuid', (c) => c.notNull().references('app_user.id').onDelete('cascade'))
    .addColumn('issuer', 'text', (c) => c.notNull())
    .addColumn('account_id', 'text', (c) => c.notNull())
    .addColumn('provider_id', 'text', (c) => c.notNull())
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('id_token', 'text')
    .addColumn('access_token_expires_at', 'timestamptz')
    .addColumn('refresh_token_expires_at', 'timestamptz')
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('account_issuer_account_unique', ['issuer', 'account_id'])
    .execute()
  await db.schema.createIndex('account_user_idx').on('account').column('user_id').execute()

  await db.schema
    .createTable('verification')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('identifier', 'text', (c) => c.notNull())
    .addColumn('value', 'text', (c) => c.notNull())
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema
    .createIndex('verification_identifier_idx')
    .on('verification')
    .column('identifier')
    .execute()

  await db.schema
    .createTable('membership')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('organization_id', 'uuid', (c) =>
      c.notNull().references('organization.id').onDelete('cascade'),
    )
    .addColumn('user_id', 'uuid', (c) => c.notNull().references('app_user.id').onDelete('cascade'))
    .addColumn('role', 'text', (c) => c.notNull().defaultTo('member'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('membership_org_user_unique', ['organization_id', 'user_id'])
    .addCheckConstraint('membership_role_check', sql`role in ('owner', 'admin', 'member')`)
    .execute()
  await db.schema.createIndex('membership_user_idx').on('membership').column('user_id').execute()

  await db.schema
    .createTable('invitation')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('organization_id', 'uuid', (c) =>
      c.notNull().references('organization.id').onDelete('cascade'),
    )
    .addColumn('email', 'text', (c) => c.notNull())
    .addColumn('role', 'text', (c) => c.notNull().defaultTo('member'))
    .addColumn('token_hash', 'text', (c) => c.notNull().unique())
    .addColumn('invited_by', 'uuid', (c) => c.references('app_user.id').onDelete('set null'))
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('accepted_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('invitation_role_check', sql`role in ('admin', 'member')`)
    .execute()
  await db.schema
    .createIndex('invitation_org_email_idx')
    .on('invitation')
    .columns(['organization_id', 'email'])
    .execute()

  await db.schema
    .createTable('project')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('organization_id', 'uuid', (c) =>
      c.notNull().references('organization.id').onDelete('cascade'),
    )
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('description', 'text')
    .addColumn('archived_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema
    .createIndex('project_org_created_idx')
    .on('project')
    .columns(['organization_id', 'created_at'])
    .execute()
  await sql`
    create trigger project_set_updated_at
    before update on project for each row execute function set_updated_at()
  `.execute(db)

  await db.schema
    .createTable('notification')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('user_id', 'uuid', (c) => c.notNull().references('app_user.id').onDelete('cascade'))
    .addColumn('type', 'text', (c) => c.notNull())
    .addColumn('title', 'text', (c) => c.notNull())
    .addColumn('body', 'text', (c) => c.notNull())
    .addColumn('read_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema
    .createIndex('notification_user_id_idx')
    .on('notification')
    .columns(['user_id', 'id'])
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const table of [
    'notification',
    'project',
    'invitation',
    'membership',
    'verification',
    'account',
    'session',
    'organization',
    'app_user',
  ]) {
    await db.schema.dropTable(table).ifExists().execute()
  }
  await sql`drop function if exists set_updated_at()`.execute(db)
}
