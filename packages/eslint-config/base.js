import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

/**
 * Shared base ESLint flat config: TypeScript (non-type-checked, fast),
 * deterministic import/export sorting, and Prettier-compatible (no stylistic
 * conflicts). Consumers spread this first, then layer framework configs on top.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default tseslint.config(
  {
    // Global ignores (a config object with only `ignores` applies repo-wide).
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.output/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.gen.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Allow `interface IFoo extends Bar {}` — naming/specializing a contract
      // in its own file is intentional (e.g. ICourseRepository).
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
    },
  },
  // Disable ESLint rules that conflict with Prettier — must be last.
  prettier,
)
