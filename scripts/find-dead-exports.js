const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      files.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

function findExports(content) {
  const re = /export\s+(?:async\s+)?(?:function|const|class|interface|type|let|var)\s+([A-Za-z0-9_]+)/g;
  const names = [];
  let m;
  while ((m = re.exec(content))) names.push(m[1]);
  return names;
}

function countOccurrences(files, name) {
  const re = new RegExp('\\b' + name + '\\b', 'g');
  let count = 0;
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    const m = c.match(re);
    if (m) count += m.length;
  }
  return count;
}

function main() {
  const root = path.resolve(process.cwd(), 'src');
  if (!fs.existsSync(root)) {
    console.error('src/ not found');
    process.exit(1);
  }
  const files = walk(root);
  const exports = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const names = findExports(content);
    for (const n of names) exports.push({ name: n, file: path.relative(process.cwd(), f) });
  }

  const suspects = [];
  for (const e of exports) {
    const occ = countOccurrences(files, e.name);
    if (occ <= 1) suspects.push({ name: e.name, file: e.file, occurrences: occ });
  }

  console.log(JSON.stringify({ totalExports: exports.length, suspects }, null, 2));
}

main();
