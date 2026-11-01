import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.venv/**',
      '**/.pytest_cache/**',
      '**/__pycache__/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
