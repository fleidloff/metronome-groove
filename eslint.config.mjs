import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import importPlugin from 'eslint-plugin-import'
import { asRule, buildZones, featureNames } from './eslint.zones.mjs'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // metronome/import-boundaries — the import graph of docs/architecture.md.
  // No `files` key: a boundary is a fact about a path, so it binds a test
  // exactly as it binds source.
  {
    name: 'metronome/import-boundaries',
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: asRule(buildZones(featureNames())),
        },
      ],
    },
  },

  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'specs/**']),
])

export default eslintConfig
