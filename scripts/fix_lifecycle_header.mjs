import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const targetFile = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');

console.log('Reading apps/web/public/eagle-flash.html...');
let html = fs.readFileSync(targetFile, 'utf-8');

// Ensure only one clean set of lifecycle th tags in thead
const theadStart = html.indexOf('<thead>');
const theadEnd = html.indexOf('</thead>', theadStart);
if (theadStart !== -1 && theadEnd !== -1) {
  let thead = html.slice(theadStart, theadEnd);
  // Replace any occurrence of multiple lifecycle-col th blocks with a single clean one
  thead = thead.replace(
    /(<th class="lifecycle-col"[^>]*>[\s\S]*?<\/th>\s*)+/gi,
    `<th class="lifecycle-col" onclick="sortTable('detectedAt')">Age</th>\r\n              <th class="lifecycle-col">4H</th>\r\n              <th class="lifecycle-col">8H</th>\r\n              <th class="lifecycle-col">1D</th>\r\n              <th class="lifecycle-col">Status</th>\r\n              `
  );
  html = html.slice(0, theadStart) + thead + html.slice(theadEnd);
  console.log('Cleaned thead in eagle-flash.html');
}

fs.writeFileSync(targetFile, html, 'utf-8');
console.log('Done!');
