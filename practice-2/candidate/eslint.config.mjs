import tseslint from 'typescript-eslint';
export default tseslint.config({
  ignores: ['**/dist/**'],
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: { parser: tseslint.parser },
  rules: { '@typescript-eslint/no-explicit-any': 'off' },
});
