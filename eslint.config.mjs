// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const nextVitalsWithLegacyUiWarnings = nextVitals.map((config) => {
  if (!config.plugins?.['react-hooks']) {
    return config;
  }

  return {
    ...config,
    rules: {
      ...config.rules,
      // Next 16 / React 19 enables additional React Hooks correctness rules.
      // Legacy UI-kit components predate these rules. Keep findings visible,
      // but do not make them release blockers while production build is green.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
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
