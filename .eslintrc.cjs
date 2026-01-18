module.exports = {
    root: true,
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        node: true
    },
    extends: [
        '@electron-toolkit/eslint-config-ts/recommended',
        '@electron-toolkit/eslint-config-prettier'
    ],
    plugins: ['react-refresh', 'react-hooks'],
    rules: {
        'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true }
        ],
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
}
