import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webNodeModules = path.resolve(__dirname, '../node_modules');
const rootNodeModules = path.resolve(__dirname, '../../../node_modules');

try {
  if (fs.existsSync(webNodeModules) && !fs.existsSync(rootNodeModules)) {
    console.log('[PREBUILD] Linking apps/web/node_modules to root node_modules for Netlify build resolution...');
    fs.symlinkSync(webNodeModules, rootNodeModules, 'junction');
    console.log('[PREBUILD] Root node_modules linked successfully.');
  }
} catch (err) {
  console.warn('[PREBUILD] Symlink notice:', err?.message);
}
