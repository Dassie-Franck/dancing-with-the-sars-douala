import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Architecture hexagonale : chaque couche ne dépend que des couches plus internes.
//   domain  <-  application  <-  infrastructure / app (composition)  <-  components / ui
const layer = (patterns) => ({ 'no-restricted-imports': ['error', { patterns }] })
const FRAMEWORKS = {
  group: ['react', 'react-dom', 'react-dom/*', 'recharts', 'maplibre-gl', 'maplibre-gl/*', 'react-globe.gl', 'three', 'lucide-react'],
  message: 'Le domaine et les cas d’usage restent indépendants des bibliothèques d’interface.',
}
const inner = (...names) => ({
  group: names.flatMap((n) => [`**/${n}`, `**/${n}/**`]),
  message: 'Cette couche ne doit pas dépendre d’une couche extérieure (voir ARCHITECTURE.md).',
})

const boundaries = [
  { files: ['src/domain/**/*.{js,jsx}'], rules: layer([FRAMEWORKS, inner('application', 'infrastructure', 'app', 'components', 'ui', 'lib')]) },
  { files: ['src/application/**/*.{js,jsx}'], rules: layer([FRAMEWORKS, inner('infrastructure', 'app', 'components', 'ui', 'lib')]) },
  { files: ['src/infrastructure/**/*.{js,jsx}'], rules: layer([inner('app', 'components', 'ui')]) },
  {
    files: ['src/components/**/*.{js,jsx}', 'src/ui/**/*.{js,jsx}', 'src/App.jsx'],
    rules: layer([{ group: ['**/infrastructure', '**/infrastructure/**'], message: 'L’interface passe par les hooks de src/app/services.jsx, jamais par un adaptateur.' }]),
  },
]

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  ...boundaries,
]
