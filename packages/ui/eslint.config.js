import base from '@repo/eslint-config/base'
import react from '@repo/eslint-config/react'

export default [
  ...base,
  ...react,
  {
    files: ['src/components/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]
