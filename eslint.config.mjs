import base from '@repo/eslint-config/base'
import react from '@repo/eslint-config/react'

export default [
  ...base,
  ...react,
  {
    files: ['apps/api/src/migrations/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['packages/ui/src/components/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]
