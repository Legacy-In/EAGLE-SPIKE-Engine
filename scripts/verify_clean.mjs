import fs from 'fs';

const files = [
  'apps/web/public/eagle-flash.html',
  'dist-eagle-flash/index.html',
  'eagle-flash.html',
  'index.html'
];

let failed = false;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  // Check outside <script> tags for unescaped ${...} template literals
  const bodyText = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  const templateLiteralMatches = [...bodyText.matchAll(/(\$\{.*?\})/g)];
  if (templateLiteralMatches.length > 0) {
    console.error(`FAIL: Found ${templateLiteralMatches.length} raw template literals in HTML of ${f}:`);
    templateLiteralMatches.forEach(m => console.error('  -> ' + m[1]));
    failed = true;
  } else {
    console.log(`PASS: ${f} is 100% clean of raw template literal tokens in HTML markup.`);
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log('ALL 3 SURFACES 100% CLEAN & VERIFIED!');
}
