import fs from 'fs';
import path from 'path';
import vm from 'vm';

const htmlFiles = [
  'index.html',
  'eagle-flash.html',
  'apps/web/public/eagle-flash.html'
];

let hasError = false;

htmlFiles.forEach(relPath => {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) return;
  const html = fs.readFileSync(fullPath, 'utf-8');
  const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];

  console.log(`Checking ${relPath}: found ${scriptMatches.length} inline script tag(s).`);

  scriptMatches.forEach((match, idx) => {
    const code = match[1];
    // Skip empty or purely whitespace scripts
    if (!code.trim()) return;
    try {
      new vm.Script(code, { filename: `${relPath}-script-${idx + 1}.js` });
      console.log(`  [OK] Script #${idx + 1} (${code.length} chars)`);
    } catch (err) {
      console.error(`  [ERROR] Script #${idx + 1} in ${relPath}:`, err.message);
      hasError = true;
    }
  });
});

if (hasError) {
  console.error('\n❌ HTML JS Validation Failed with syntax errors.');
  process.exit(1);
} else {
  console.log('\n✅ HTML JS Validation Passed: All inline scripts syntax clean.');
}
