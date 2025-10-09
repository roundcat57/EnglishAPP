module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'react-hooks/exhaustive-deps': 'off',
    'react-hooks/rules-of-hooks': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
  }
};
