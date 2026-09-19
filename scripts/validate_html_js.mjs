import fs from 'fs';
import path from 'path';
import vm from 'vm';

const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');

const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
console.log(`Found ${scriptMatches.length} script tags.`);

scriptMatches.forEach((match, idx) => {
  const code = match[1];
  try {
    new vm.Script(code);
    console.log(`Script tag #${idx + 1}: Syntax OK (${code.length} chars)`);
  } catch (err) {
    console.error(`Script tag #${idx + 1}: Syntax Error:`, err.message);
  }
});
