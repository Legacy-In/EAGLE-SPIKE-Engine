import fs from 'fs';
import path from 'path';

const eaglePath = path.resolve('apps/web/public/eagle-flash.html');
let content = fs.readFileSync(eaglePath, 'utf8');

// The duplicate block is between the first occurrence of "// SECTOR TAXONOMY & ANOMALY INTELLIGENCE"
// and the second occurrence.
const marker = '// ═════════════════════════════════════════════════════════════════════════\n    // SECTOR TAXONOMY & ANOMALY INTELLIGENCE';

const firstIdx = content.indexOf(marker);
const secondIdx = content.indexOf(marker, firstIdx + marker.length);

if (firstIdx !== -1 && secondIdx !== -1) {
  console.log('Found duplicate SECTOR_MAP block between', firstIdx, 'and', secondIdx);
  // Cut out the first partial block
  content = content.slice(0, firstIdx) + content.slice(secondIdx);
  fs.writeFileSync(eaglePath, content, 'utf8');
  fs.writeFileSync(path.resolve('dist-eagle-flash/index.html'), content, 'utf8');
  console.log('Removed duplicate block and saved to eagle-flash.html & dist-eagle-flash/index.html');
} else {
  console.log('Duplicate block not found by marker. First:', firstIdx, 'Second:', secondIdx);
}
