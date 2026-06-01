import fs from 'fs';
import { execSync } from 'child_process';

const MARKER = "export const dynamic = 'force-dynamic';";
const files = execSync('find app/api -name route.ts', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

function findImportEnd(lines) {
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^import\s/.test(line)) {
      i++;
      while (i < lines.length && !/from\s+['"]/.test(lines[i])) i++;
      if (i < lines.length) i++;
      continue;
    }
    const t = line.trim();
    if (t === '' || t.startsWith('//')) {
      i++;
      continue;
    }
    break;
  }
  return i;
}

let patched = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(MARKER)) continue;

  const lines = content.split('\n');
  const at = findImportEnd(lines);
  lines.splice(at, 0, MARKER, '');
  fs.writeFileSync(file, lines.join('\n'));
  patched++;
  console.log('patched:', file);
}

console.log(`Total patched: ${patched}`);
