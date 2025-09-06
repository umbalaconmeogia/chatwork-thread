# Architecture Design

## Overview

Architecture Design mô tả kiến trúc tổng thể của project, cách tổ chức source code, build process và deployment strategy. Tài liệu này tập trung vào **WHERE** (cấu trúc project) và **WHEN** (build/deploy process).

## Project Structure

### Monorepo Architecture

```
chatwork-thread/
├── src/
│   ├── core/                           # Shared business logic
│   │   ├── api/
│   │   │   ├── ChatworkAPI.ts
│   │   │   ├── types.ts
│   │   │   └── errors.ts
│   │   ├── analyzer/
│   │   │   ├── ThreadAnalyzer.ts
│   │   │   ├── MessageParser.ts
│   │   │   └── RelationshipDetector.ts
│   │   ├── database/
│   │   │   ├── DatabaseManager.ts
│   │   │   ├── models/
│   │   │   │   ├── Thread.ts
│   │   │   │   ├── Message.ts
│   │   │   │   └── User.ts
│   │   │   └── migrations/
│   │   ├── types/
│   │   │   ├── Message.ts
│   │   │   ├── Thread.ts
│   │   │   └── User.ts
│   │   └── index.ts                    # Export all core modules
│   ├── cli/                            # CLI specific
│   │   ├── commands/
│   │   │   ├── CreateThreadCommand.ts
│   │   │   ├── ListThreadsCommand.ts
│   │   │   ├── ShowThreadCommand.ts
│   │   │   └── AddMessageCommand.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── api.ts
│   │   │   └── app.ts
│   │   └── index.ts                    # CLI entry point
│   └── chrome/                         # Chrome Extension specific
│       ├── background/
│       │   ├── background.ts
│       │   └── messageHandler.ts
│       ├── content/
│       │   ├── content.ts
│       │   └── threadPanel.ts
│       ├── popup/
│       │   ├── popup.ts
│       │   └── popup.html
│       ├── manifest.json
│       └── index.ts                    # Extension entry point
├── dist/                               # Build outputs
│   ├── cli/
│   │   ├── chatwork-thread.js          # Bundled CLI app
│   │   └── package.json                # For npm publish
│   └── chrome/
│       ├── manifest.json
│       ├── background.js
│       ├── content.js
│       ├── popup.js
│       ├── popup.html
│       └── assets/
├── build/                              # Build scripts
│   ├── cli.js                          # Build CLI
│   ├── chrome.js                       # Build Chrome Extension
│   └── shared.js                       # Build shared core
├── tests/
│   ├── unit/
│   │   ├── core/
│   │   ├── cli/
│   │   └── chrome/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── SystemDesign/
│   ├── dev/
│   └── api/
├── package.json                        # Root package.json
├── tsconfig.json                       # TypeScript config
├── .eslintrc.js
├── .prettierrc
└── jest.config.js
```

### Directory Responsibilities

#### `/src/core/`
- **Purpose**: Shared business logic between LocalApp and Chrome Extension
- **Contents**: API clients, analyzers, database managers, type definitions
- **Reusability**: Designed to work in both Node.js and browser environments

#### `/src/cli/`
- **Purpose**: CLI specific implementation
- **Contents**: CLI commands, configuration, Node.js specific code
- **Dependencies**: Uses core modules, adds CLI-specific functionality

#### `/src/chrome/`
- **Purpose**: Chrome Extension specific implementation
- **Contents**: Background scripts, content scripts, popup, manifest
- **Dependencies**: Uses core modules, adds browser-specific functionality

#### `/dist/`
- **Purpose**: Build outputs for distribution
- **Contents**: Compiled JavaScript, bundled files, ready-to-deploy packages
- **Structure**: Separate directories for each target (cli, chrome)

#### `/build/`
- **Purpose**: Build scripts and configuration
- **Contents**: Build scripts for different targets, bundling configuration
- **Tools**: esbuild, webpack, or other bundlers

## Build Strategy

### Build Targets

#### 1. Shared Core
- **Input**: `src/core/**/*.ts`
- **Output**: `dist/core/` (for import by other modules)
- **Purpose**: Compile TypeScript to JavaScript, maintain module structure
- **Tool**: TypeScript compiler

#### 2. CLI
- **Input**: `src/core/**/*.ts` + `src/cli/**/*.ts`
- **Output**: `dist/cli/chatwork-thread.js` (single bundled file)
- **Purpose**: Create standalone CLI application
- **Tool**: esbuild (bundle + minify)

#### 3. Chrome Extension
- **Input**: `src/core/**/*.ts` + `src/chrome/**/*.ts`
- **Output**: `dist/chrome/` (multiple files for extension)
- **Purpose**: Create Chrome Extension package
- **Tool**: esbuild (separate bundles for each script)

### Build Scripts

#### Package.json Scripts
```json
{
  "scripts": {
    "build": "npm run build:core && npm run build:cli && npm run build:chrome",
    "build:core": "node build/shared.js",
    "build:cli": "node build/cli.js",
    "build:chrome": "node build/chrome.js",
    "dev:cli": "npm run build:core && npm run build:cli && node dist/cli/chatwork-thread.js",
    "dev:chrome": "npm run build:chrome && npm run watch:chrome",
    "watch:chrome": "chokidar 'src/chrome/**/*' -c 'npm run build:chrome'",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "clean": "rimraf dist/"
  }
}
```

#### Build Script Implementation

**build/shared.js:**
```javascript
const { build } = require('esbuild');
const path = require('path');

async function buildCore() {
  await build({
    entryPoints: ['src/core/index.ts'],
    bundle: false, // Keep module structure
    outdir: 'dist/core',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    external: ['better-sqlite3'] // External dependencies
  });
}

buildCore().catch(console.error);
```

**build/cli.js:**
```javascript
const { build } = require('esbuild');
const path = require('path');

async function buildCLI() {
  await build({
    entryPoints: ['src/cli/index.ts'],
    bundle: true, // Single file bundle
    outfile: 'dist/cli/chatwork-thread.js',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    external: ['better-sqlite3'],
    banner: {
      js: '#!/usr/bin/env node'
    }
  });
}

buildCLI().catch(console.error);
```

**build/chrome.js:**
```javascript
const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');

async function buildExtension() {
  // Build background script
  await build({
    entryPoints: ['src/chrome/background/background.ts'],
    bundle: true,
    outfile: 'dist/chrome/background.js',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true
  });

  // Build content script
  await build({
    entryPoints: ['src/chrome/content/content.ts'],
    bundle: true,
    outfile: 'dist/chrome/content.js',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true
  });

  // Build popup
  await build({
    entryPoints: ['src/chrome/popup/popup.ts'],
    bundle: true,
    outfile: 'dist/chrome/popup.js',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true
  });

  // Copy manifest and HTML files
  fs.copyFileSync('src/chrome/manifest.json', 'dist/chrome/manifest.json');
  fs.copyFileSync('src/chrome/popup/popup.html', 'dist/chrome/popup.html');
}

buildExtension().catch(console.error);
```

## Development Workflow

### Development Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Development Mode**
   ```bash
   # Watch mode for LocalApp
   npm run dev:localapp
   
   # Watch mode for Extension
   npm run dev:extension
   ```

3. **Testing**
   ```bash
   # Run all tests
   npm test
   
   # Watch mode
   npm run test:watch
   ```

### Code Organization Principles

#### 1. Separation of Concerns
- **Core**: Pure business logic, no platform dependencies
- **LocalApp**: CLI-specific code, Node.js dependencies
- **Extension**: Browser-specific code, Chrome APIs

#### 2. Dependency Direction
```
LocalApp → Core
Extension → Core
Core → (no dependencies on LocalApp/Extension)
```

#### 3. Import Strategy
```typescript
// ✅ Good: LocalApp importing from Core
import { ChatworkAPI, ThreadAnalyzer } from '../../core';

// ✅ Good: Extension importing from Core
import { ChatworkAPI, ThreadAnalyzer } from '../../core';

// ❌ Bad: Core importing from LocalApp/Extension
import { CliCommand } from '../localapp/cli';
```

## Deployment Strategy

### LocalApp Deployment

#### 1. NPM Package
- **Build**: `npm run build:localapp`
- **Package**: Create npm package with `dist/localapp/`
- **Publish**: `npm publish`
- **Install**: `npm install -g chatwork-thread`

#### 2. Standalone Executable
- **Tool**: `pkg` or `nexe`
- **Build**: Bundle Node.js runtime with application
- **Distribution**: Direct download, GitHub releases

#### 3. Package Structure
```
dist/localapp/
├── chatwork-thread.js          # Main executable
├── package.json                # NPM package info
├── README.md                   # Usage instructions
└── LICENSE                     # License file
```

### Chrome Extension Deployment

#### 1. Chrome Web Store
- **Build**: `npm run build:extension`
- **Package**: Zip `dist/extension/` directory
- **Upload**: Chrome Web Store Developer Dashboard
- **Distribution**: Chrome Web Store

#### 2. Manual Installation
- **Build**: `npm run build:extension`
- **Load**: Chrome Extensions page → Load unpacked
- **Distribution**: Direct download, GitHub releases

#### 3. Extension Structure
```
dist/extension/
├── manifest.json               # Extension manifest
├── background.js               # Background script
├── content.js                  # Content script
├── popup.js                    # Popup script
├── popup.html                  # Popup HTML
└── assets/                     # Static assets
```

## Tooling Configuration

### TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@core/*": ["core/*"],
      "@localapp/*": ["localapp/*"],
      "@extension/*": ["extension/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### ESLint Configuration

**.eslintrc.js:**
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  env: {
    node: true,
    es2020: true
  }
};
```

### Prettier Configuration

**.prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Jest Configuration

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

## Future Extensibility

### Adding New Targets

#### 1. Electron Desktop Application (Noted but not implemented)
- **Structure**: `src/gui/`
  ```
  src/gui/
  ├── main.ts             # Main process (Node.js)
  ├── renderer/           # Renderer process (Browser)
  │   ├── index.html
  │   ├── app.ts          # TypeScript
  │   └── components/     # React/Vue components
  └── preload.ts          # Bridge between main và renderer
  ```
- **Build**: `build/gui.js`
- **Output**: `dist/gui/`
- **Dependencies**: Core modules + Electron-specific code
- **Cross-platform**: Windows, macOS, Ubuntu
- **Code Reuse**: 100% tái sử dụng Node.js/TypeScript code
- **Status**: Noted for future consideration, not implemented

#### 2. Web Application
- **Structure**: `src/webapp/`
- **Build**: `build/webapp.js`
- **Output**: `dist/webapp/`
- **Dependencies**: Core modules + web-specific code

#### 3. Mobile Application
- **Structure**: `src/mobile/`
- **Build**: `build/mobile.js`
- **Output**: `dist/mobile/`
- **Dependencies**: Core modules + React Native-specific code

### Scaling Considerations

#### 1. Monorepo Management
- **Tool**: Lerna or Nx for advanced monorepo management
- **Benefits**: Automated versioning, dependency management, build orchestration

#### 2. Microservices Architecture
- **Core as Service**: Deploy core logic as separate service
- **API Gateway**: Centralized API management
- **Service Discovery**: Dynamic service location

#### 3. Plugin Architecture
- **Plugin System**: Allow third-party extensions
- **Plugin API**: Standardized interface for plugins
- **Plugin Registry**: Centralized plugin management

## Performance Considerations

### Build Performance
- **Incremental Builds**: Only rebuild changed modules
- **Parallel Builds**: Build multiple targets simultaneously
- **Caching**: Cache build artifacts and dependencies
- **Watch Mode**: Fast rebuilds during development

### Runtime Performance
- **Lazy Loading**: Load modules on demand
- **Tree Shaking**: Remove unused code
- **Code Splitting**: Split large bundles into smaller chunks
- **Caching**: Cache API responses and analysis results

### Development Performance
- **Hot Reload**: Fast development feedback
- **Source Maps**: Accurate debugging information
- **Type Checking**: Fast TypeScript compilation
- **Linting**: Fast code quality checks

## Configuration Management

### Sensitive Configuration (.env files)

#### CLI Configuration
```
# .env (không commit lên git)
CHATWORK_API_TOKEN=your_api_token_here
CHATWORK_API_BASE_URL=https://api.chatwork.com/v2
DB_PATH=./data/threads.db
LOG_LEVEL=info
```

#### Configuration Loading Strategy
```typescript
// src/cli/config/app.ts
import { config } from 'dotenv';
import { join } from 'path';

// Load .env file
config({ path: join(process.cwd(), '.env') });

export const appConfig = {
  api: {
    token: process.env.CHATWORK_API_TOKEN || '',
    baseURL: process.env.CHATWORK_API_BASE_URL || 'https://api.chatwork.com/v2',
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000')
  },
  database: {
    path: process.env.DB_PATH || './data/threads.db',
    backupPath: process.env.DB_BACKUP_PATH || './data/backups/',
    backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '86400000') // 24h
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    file: process.env.LOG_FILE
  },
  thread: {
    maxMessages: parseInt(process.env.THREAD_MAX_MESSAGES || '1000'),
    analysisTimeout: parseInt(process.env.THREAD_ANALYSIS_TIMEOUT || '30000')
  }
};
```

#### .gitignore Configuration
```
# Environment files
.env
.env.local
.env.*.local

# Database files
data/
*.db
*.sqlite

# Log files
logs/
*.log

# Config files with sensitive data
config.local.json
```

#### Configuration Validation
```typescript
// src/cli/config/validator.ts
export function validateConfig(config: AppConfig): void {
  if (!config.api.token) {
    throw new Error('CHATWORK_API_TOKEN is required');
  }
  
  if (!config.database.path) {
    throw new Error('Database path is required');
  }
  
  // Validate API token format
  if (!/^[a-zA-Z0-9]{40}$/.test(config.api.token)) {
    throw new Error('Invalid Chatwork API token format');
  }
}
```

### Configuration Sources Priority

1. **Command Line Arguments** (highest priority)
2. **Environment Variables** (.env file)
3. **Config File** (config.json)
4. **Default Values** (lowest priority)

### Security Considerations

- **Never commit** .env files to git
- **Validate** all configuration values
- **Encrypt** sensitive data if needed
- **Use** environment-specific configs
- **Rotate** API tokens regularly
