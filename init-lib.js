#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const globalNodeModules = getGlobalNodeModulesPath()
const readlineSync = requireModule('readline-sync')
requireModule('dotenv').config({ path: path.join(__dirname, '.env') })

const projectName = process.argv[2]
const initVersion = process.env.INIT_VERSION || '0.0.1'
const githubToken = process.env.GITHUB_ACCESS_TOKEN
const githubUsername = process.env.GITHUB_USERNAME
const projectDir = path.resolve(process.cwd(), projectName)
let repoCreated = false

const initLib = () => {
  validateProjectName(projectName)
  validateProjectDirectory(projectDir)

  createProjectStructure(projectDir, filesToCreate)
  initializeGitRepo()
  installDependencies()
  if (repoCreated) configSemanticRelease()
  openVscode()

  console.log(`Projet ${projectName} initialisé avec succès !`)
}

function getGlobalNodeModulesPath() {
  return execSync('npm root -g').toString().trim();
}

function requireModule(moduleName) {
  return require(path.join(globalNodeModules, moduleName));
}

function validateProjectName(projectName) {
  if (!projectName) {
    console.error('Veuillez spécifier un nom de projet :');
    console.error('  >> npminitlib <nom-du-projet>');
    process.exit(1);
  }
}

function validateProjectDirectory(projectDir) {
  if (fs.existsSync(projectDir)) {
    console.error(`Le répertoire ${projectName} existe déjà. Choisissez un autre nom.`);
    process.exit(1);
  }
}

function openVscode() {
  execSync('code .', { cwd: projectDir })
}

const packageJsonContent = {
  name: projectName,
  version: initVersion,
  description: '',
  main: 'index.js',
  scripts: {
    build: 'tsc',
    "type-check": "tsc --noEmit",
    test: "jest",
    "test:adhoc": "ts-node __tests__/adHoc.ts",
    "test:adhoc:watch": "nodemon --watch src/**/*.ts --exec ts-node __tests__/adHoc.ts",
    lint: "eslint .",
    "lint:fix": "eslint . --fix",
    "prettier:check": "prettier --check .",
    "prettier:fix": "prettier --write .",
    release: "semantic-release",
    "pre-bump": "npm run prettier:check && npm run lint && npm run type-check && npm run test",
    "pre-commit": "npm run lint && npm run test",
    "pre-commit": "echo 'Commit complete!'",
    prepare: "husky install",
    pack: "npm pack && cross-env-shell mv *.tgz dist/ || move *.tgz dist/"
  },
  keywords: [],
  author: githubUsername,
  license: 'MIT',
  dependencies: {
    dotenv: '^16.4.5',
  },
  devDependencies: {
    '@commitlint/cli': '^19.4.0',
    '@commitlint/config-conventional': '^19.2.2',
    'semantic-release': '^24.1.0',
    '@types/jest': '^29.5.12',
    '@typescript-eslint/eslint-plugin': '^8.1.0',
    '@typescript-eslint/parser': '^8.1.0',
    "cross-env-shell": "^7.0.3",
    eslint: '^9.9.0',
    'eslint-config-prettier': '^9.1.0',
    'eslint-plugin-prettier': '^5.2.1',
    husky: '^8.0.0',
    jest: '^29.7.0',
    'lint-staged': '^15.2.9',
    prettier: '^3.3.3',
    'semantic-release': '^24.0.0',
    'ts-jest': '^29.2.4',
    typescript: '^5.5.4',
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.js": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
const gitIgnoreContent = `
# Node modules
node_modules
node_modules/*

# Build output
lib
lib/*

# Environment files
.env

# IDE config files
.vscode
.vscode/*

# Package lock
package-lock.json

# OS-specific files
.DS_Store
Thumbs.db

# Other files
*.log
*.tmp

# Exclut tout dans dist sauf les fichiers .tgz
dist/*
!dist/*.tgz
`
const gitattributesContent = `
* text=auto eol=lf
`
const eslintConfigContent = `
/** @type {import('eslint').FlatConfig} */
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
    ],
  },
  {
    languageOptions: {
      globals: {
        browser: 'readonly',
        node: 'readonly',
        es2021: true,
      },
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
      'no-console': 'off',
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
    },
  },
  {
    files: ['*.ts', '*.tsx'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['*.js', '*.jsx'],
    rules: {
      'no-console': 'off', // Example rule for JavaScript files
    },
  },
  {
    files: ['*.json', '.github/*'],
    rules: {
      'prettier/prettier': ['error', { singleQuote: false }],
    },
  },
  {
    files: ['package.json', 'package-lock.json', 'tsconfig.json'],
    rules: {
      'prettier/prettier': 'off',
    },
  },
]
`
const prettierConfigContent = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
}
const releaseRcContent = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: ['dist/*.tgz'],
      },
    ],
  ],
  release: {
    analyzeCommits: {
      preset: 'conventionalcommits',
      releaseRules: [
        {
          type: 'docs',
          release: 'patch',
        },
      ],
    },
  },
}
const jestConfigContent = `
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/'
  ]
}
`
const npmIgnoreContent = `
# Exclude source files
src
src/*

# Include compiled code
!lib
!lib/*

# Ignore tests
__tests__
__tests__/*

# Exclude GitHub workflows
.github
.github/*

# Exclude Husky configuration
.husky
.husky/*

# Ignore IDE config files
.vscode
.vscode/*

# Exclude distribution files and directories
dist
dist/*
lib
lib/*

# Exclude environment file and Git ignore files
.env
.gitignore
.gitattributes

# Exclude configuration files and development-related files
CONFIGURATION.md
jest.config.js
.prettierrc
.releaserc
commitlint.config.js
eslint.config.js
package-lock.json

# Include any additional files or directories to be excluded here
`
const commitLintContent = `
module.exports = {
  extends: ['@commitlint/config-conventional'],
}
`
const tsConfigContent = `
{
    "compilerOptions": {
      /* Visit https://aka.ms/tsconfig to read more about this file */
  
      /* Language and Environment */
      "target": "es2016" /* Set the JavaScript language version for emitted JavaScript and include compatible library declarations. */,
  
      /* Modules */
      "module": "commonjs" /* Specify what module code is generated. */,
      "rootDir": "./src" /* Specify the root folder within your source files. */,
      "moduleResolution": "node" /* Specify how TypeScript looks up a file from a given module specifier. */,
  
      /* Emit */
      "declaration": true /* Generate .d.ts files from TypeScript and JavaScript files in your project. */,
      "outDir": "./lib" /* Specify an output folder for all emitted files. */,
  
      /* Interop Constraints */
      "esModuleInterop": true /* Emit additional JavaScript to ease support for importing CommonJS modules. This enables 'allowSyntheticDefaultImports' for type compatibility. */,
      "forceConsistentCasingInFileNames": true /* Ensure that casing is correct in imports. */,
  
      /* Type Checking */
      "strict": true /* Enable all strict type-checking options. */,
  
      /* Completeness */
      "skipLibCheck": true /* Skip type checking all .d.ts files. */
    },
    "include": ["src/**/*.ts"],
    "exclude": ["node_modules", "**/__tests__/**"]
}
`
const readMeContent = `# ${projectName} Library\n\n## Description\n`

const configurationContent = `
`
const licenseContent = `
MIT License

Copyright (c) 2024 Christian Nana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
const envContent = `
`
const releaseYmlContent = `
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Print Node.js and npm versions
        run: node -v && npm -v

      - name: Install dependencies
        run: npm install

      - name: Check code formatting
        run: npm run prettier:check

      - name: Lint code
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Run Semantic Release
        env:
          GITHUB_TOKEN: \${{ secrets.P_GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: npm run release
`

const filesToCreate = {
  'package.json': JSON.stringify(packageJsonContent, null, 2),
  '.gitignore': gitIgnoreContent,
  '.gitattributes': gitattributesContent,
  'eslint.config.js': eslintConfigContent,
  '.prettierrc': JSON.stringify(prettierConfigContent, null, 2),
  '.releaserc': JSON.stringify(releaseRcContent, null, 2),
  'jest.config.js': jestConfigContent,
  '.npmignore': npmIgnoreContent,
  'commitlint.config.js': commitLintContent,
  'tsconfig.json': tsConfigContent,
  'README.md': readMeContent,
  'CONFIGURATION.md': configurationContent,
  LICENSE: licenseContent,
  '.env': envContent,
  'src/index.ts': '',
  '.github/workflows/release.yml': releaseYmlContent,
}

function createProjectStructure(projectDir, filesToCreate) {
  console.log(`Création du projet dans ${projectDir}...`);

  fs.mkdirSync(projectDir);
  process.chdir(projectDir);

  const subDirs = ['src', '.github', '.github/workflows', 'lib', 'dist', '__tests__'];
  subDirs.forEach(dir => fs.mkdirSync(path.join(projectDir, dir)));

  for (const [file, content] of Object.entries(filesToCreate)) {
    const filePath = path.join(projectDir, file);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fichier créé : ${filePath}`);
  }

  console.log('Structure du projet créée avec succès.');
}

function initializeGitRepo() {
  try {
    console.log('Initialisation du dépôt Git...')
    initializeLocalGitRepo()
    console.log('Dépôt Git initialisé.')

    if (readlineSync.keyInYNStrict('Voulez-vous creer un depot distant sur GitHub ?')) {
      const repoName = readlineSync.question('Entrez le nom du depot GitHub : ')
      const isPrivate = readlineSync.keyInYNStrict('Le depot doit-il etre prive ?')
      createRemoteRepo(repoName, isPrivate)
      repoCreated = true
    } else {
      console.log('Aucun dépôt distant créé.')
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du dépôt Git:', error)
  }
}

function initializeLocalGitRepo() {
  execSync('git init', { cwd: projectDir })
  execSync('git add .', { cwd: projectDir })
  const commitMessage = `feat: initial commit ${projectDir} v${initVersion}`
  execSync(`git commit -m "${commitMessage}"`, { cwd: projectDir })
}

async function createRemoteRepo(repoName, isPrivate) {
  try {
    const url = `https://api.github.com/user/repos`
    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
    const data = JSON.stringify({
      name: repoName,
      private: isPrivate
    })

    const curlCommand = `curl -X POST -H "Authorization: ${headers['Authorization']}" -H "Accept: ${headers['Accept']}" -H "Content-Type: ${headers['Content-Type']}" -d "${data.replace(/"/g, '\\"')}" ${url}`
    execSync(curlCommand)

    console.log(`Dépôt distant créé : https://github.com/${githubUsername}/${repoName}`)
    execSync(`git remote add origin https://github.com/${githubUsername}/${repoName}.git`, { cwd: projectDir })
    console.log('Dépôt distant ajouté.')
  } catch (error) {
    console.error('Erreur lors de la création du dépôt distant:', error)
  }
}


function installDependencies() {
  process.stdout.write('\uFEFF')
  const answer = readlineSync.keyInYNStrict(
    'Voulez-vous installer les dependances ?',
  )

  if (answer) {
    console.log('Installation des dépendances...')
    execSync('npm install', { cwd: projectDir, stdio: 'inherit' })
    console.log('Dépendances installées.')
  } else {
    console.log('Installation des dépendances ignorée.')
  }
}

function configSemanticRelease() {
  const answer = readlineSync.keyInYNStrict(
    'Voulez-vous configurer Semantic Release ?',
  )

  if (answer) {
    const token = process.env.GITHUB_ACCESS_TOKEN
    console.log('Configuration de Semantic Release...')
    execSync(`npx semantic-release-cli setup --ci --npm-package --npm-registry="https://registry.npmjs.org/" --github-token=${token}  --github-url="https://github.com" --ci-provider="github-actions"`, { stdio: 'inherit' })
    console.log('Configuration terminée.')
  } else {
    console.log('Configuration de Semantic Release ignorée.')
  }
}

initLib()
