import base from '@repo/eslint-config/base'
import react from '@repo/eslint-config/react'

export default [
  ...base,
  ...react,
  {
    ignores: ['src/routeTree.gen.ts'],
  },
]
