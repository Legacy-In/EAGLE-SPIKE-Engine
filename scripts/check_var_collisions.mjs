import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const sigmaHtml = fs.readFileSync(path.join(rootDir, 'sigma_btc_live.html'), 'utf-8');
const eagleHtml = fs.readFileSync(path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html'), 'utf-8');

const sigmaScriptMatch = sigmaHtml.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
const sigmaScripts = sigmaScriptMatch ? sigmaScriptMatch[1] : '';

const eagleScriptMatch = eagleHtml.match(/<!-- APPLICATION JAVASCRIPT LOGIC -->\s*<script>([\s\S]*?)<\/script>\s*<\/body>/i);
const eagleScripts = eagleScriptMatch ? eagleScriptMatch[1] : '';

const getVarNames = (src) => {
  const matches = src.matchAll(/(?:let|const|var)\s+([a-zA-Z0-9_]+)\s*=/g);
  return new Set([...matches].map(m => m[1]));
};

const sigmaVars = getVarNames(sigmaScripts);
const eagleVars = getVarNames(eagleScripts);

const collisions = [...sigmaVars].filter(v => eagleVars.has(v));
console.log('Variable collisions:', collisions);
