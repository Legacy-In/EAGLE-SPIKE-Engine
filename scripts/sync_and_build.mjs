import fs from 'fs';
import { execSync } from 'child_process';

console.log('Copying apps/web/public/eagle-flash.html to dist-eagle-flash/index.html...');
fs.copyFileSync('apps/web/public/eagle-flash.html', 'dist-eagle-flash/index.html');
console.log('Rebuilding root index.html...');
execSync('node scripts/build_full_site.mjs', { stdio: 'inherit' });
console.log('Synchronized and rebuilt successfully.');
