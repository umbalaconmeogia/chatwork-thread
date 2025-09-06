const { build } = require('esbuild');
const path = require('path');

async function buildCLI() {
  console.log('🔧 Building CLI application...');

  try {
    await build({
      entryPoints: ['src/cli/index.ts'],
      bundle: true, // Single file bundle
      outfile: 'dist/cli/chatwork-thread.js',
      format: 'cjs',
      platform: 'node',
      target: 'node18',
      sourcemap: true,
      external: ['better-sqlite3'],
      tsconfig: './tsconfig.json'
    });

    console.log('✅ CLI application built successfully');
  } catch (error) {
    console.error('❌ CLI build failed:', error);
    process.exit(1);
  }
}

buildCLI().catch(console.error);
