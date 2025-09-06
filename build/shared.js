const { build } = require('esbuild');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

async function buildCore() {
  console.log('🔧 Building core modules...');

  // Get all TypeScript files in core directory
  function getTypeScriptFiles(dir) {
    const files = [];
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      if (statSync(fullPath).isDirectory()) {
        files.push(...getTypeScriptFiles(fullPath));
      } else if (item.endsWith('.ts') && !item.includes('.test.') && !item.includes('.spec.')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  const entryPoints = getTypeScriptFiles('src/core');

  console.log(`📋 Found ${entryPoints.length} core files to build`);

  try {
    await build({
      entryPoints: entryPoints,
      bundle: false, // Keep module structure
      outdir: 'dist/core',
      format: 'cjs',
      platform: 'node',
      target: 'node18',
      sourcemap: true,
      tsconfig: './tsconfig.json'
    });

    console.log('✅ Core modules built successfully');
  } catch (error) {
    console.error('❌ Core build failed:', error);
    process.exit(1);
  }
}

buildCore().catch(console.error);
