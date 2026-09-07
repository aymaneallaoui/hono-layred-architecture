import base from '@repo/eslint-config/base'

export default [
  ...base,
  {
    files: ['src/migrations/**/*.ts'],
    rules: {
      // Migrations are typed against `Kysely<any>`, and freshly-scaffolded
      // up/down stubs have an unused `db` until filled in.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]
