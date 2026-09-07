import base from '@repo/eslint-config/base'

export default [...base, { ignores: ['playwright-report/**', 'test-results/**'] }]
