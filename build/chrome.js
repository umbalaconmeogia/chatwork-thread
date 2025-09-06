const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');

async function buildExtension() {
  console.log('🔧 Building Chrome Extension...');

  try {
    // Build background script
    await build({
      entryPoints: ['src/chrome/background/background.ts'],
      bundle: true,
      outfile: 'dist/chrome/background.js',
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      tsconfig: './tsconfig.json'
    });

    // Build content script
    await build({
      entryPoints: ['src/chrome/content/content.ts'],
      bundle: true,
      outfile: 'dist/chrome/content.js',
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      tsconfig: './tsconfig.json'
    });

    // Build popup
    await build({
      entryPoints: ['src/chrome/popup/popup.ts'],
      bundle: true,
      outfile: 'dist/chrome/popup.js',
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      tsconfig: './tsconfig.json'
    });

    // Copy manifest and HTML files
    if (fs.existsSync('src/chrome/manifest.json')) {
      fs.copyFileSync('src/chrome/manifest.json', 'dist/chrome/manifest.json');
    }
    if (fs.existsSync('src/chrome/popup/popup.html')) {
      fs.copyFileSync('src/chrome/popup/popup.html', 'dist/chrome/popup.html');
    }

    console.log('✅ Chrome Extension built successfully');
  } catch (error) {
    console.error('❌ Chrome Extension build failed:', error);
    process.exit(1);
  }
}

buildExtension().catch(console.error);
