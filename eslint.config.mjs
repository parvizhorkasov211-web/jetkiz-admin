// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const nextVitalsWithLegacyUiWarnings = nextVitals.map((config) => {
  if (!config.plugins?.['react-hooks']) {
    return config;
  }

  const rules = Object.fromEntries(
    Object.entries(config.rules ?? {}).map(([ruleName, severity]) => {
      if (
        ruleName.startsWith('react-hooks/') &&
        ruleName !== 'react-hooks/rules-of-hooks'
      ) {
        return [ruleName, 'warn'];
      }

      return [ruleName, severity];
    }),
  );

  return {
    ...config,
    rules,
  };
});

const eslintConfig = defineConfig([
  ...nextVitalsWithLegacyUiWarnings,
  ...nextTs,
  prettier,
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'prisma/**',
    'next-env.d.ts',
    'app/**/*.js',
    'app/**/*.js.map',
  ]),
]);

export default eslintConfig;
