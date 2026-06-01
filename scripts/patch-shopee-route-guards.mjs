import fs from 'fs';
import { execSync } from 'child_process';

const IMPORT_LINE = "import { guardShopeeRoute } from '@/lib/shopee-route-guard';";
const GUARD_BLOCK = `    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
`;

const files = execSync('find app/api/shopee app/api/shopee-ads -name route.ts 2>/dev/null', {
  encoding: 'utf8',
})
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
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('guardShopeeRoute')) continue;

  const lines = content.split('\n');
  const at = findImportEnd(lines);
  lines.splice(at, 0, IMPORT_LINE, '');
  content = lines.join('\n');

  const updated = content.replace(
    /(export async function (?:GET|POST|PUT|PATCH|DELETE)\([^)]*\) \{\s*try \{\s*\n)/g,
    `$1${GUARD_BLOCK}`,
  );

  if (updated === content) {
    console.warn('skip (no try block):', file);
    continue;
  }

  fs.writeFileSync(file, updated);
  patched++;
  console.log('guarded:', file);
}

console.log(`Total guarded: ${patched}`);
