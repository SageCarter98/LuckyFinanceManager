import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// Scoped deliberately to accessibility (WCAG 2.1 AA prep, Gate 3/G3
// Phase 4) -- not a general-purpose lint setup. jsx-a11y's own
// "recommended" preset is the baseline; add stricter rules over time as
// real findings warrant them, not preemptively. Only the two classic
// react-hooks rules are enabled (not its "recommended" preset, which in
// the installed version pulls in the much broader React Compiler rule
// suite -- a real but separate quality dimension, out of scope here) --
// enough to stop the codebase's existing eslint-disable comments
// (TransactionsPage.tsx, VerifyEmailPage.tsx) from becoming
// "rule not found" errors themselves.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
