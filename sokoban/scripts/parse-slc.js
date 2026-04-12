// parse-slc.js  –  reads Original.slc and writes src/config/levels_original.ts
'use strict';

const fs   = require('fs');
const path = require('path');

const SLC_PATH = path.resolve(__dirname, '../../docs/Original.slc');
const OUT_PATH = path.resolve(__dirname, '../src/config/levels_original.ts');

const raw = fs.readFileSync(SLC_PATH, 'utf-8');

// Extract each <Level ...>...</Level> block
const levelBlocks = [];
const levelRe = /<Level[^>]*>([\s\S]*?)<\/Level>/g;
let m;
while ((m = levelRe.exec(raw)) !== null) {
  levelBlocks.push(m[1]);
}

console.log(`Found ${levelBlocks.length} levels`);

// For each block, extract <L>...</L> rows
const levels = levelBlocks.map((block, idx) => {
  const rows = [];
  const rowRe = /<L>(.*?)<\/L>/g;
  let rm;
  while ((rm = rowRe.exec(block)) !== null) {
    rows.push(rm[1]);
  }
  if (rows.length === 0) {
    console.warn(`WARNING: Level ${idx + 1} has no rows`);
  }
  return rows;
});

// Build TypeScript output
const lines = [];
lines.push('// 今林宏行 原始关卡（Original + Extra，共90关）');
lines.push('// 来源：Thinking Rabbit 1982');
lines.push('');
lines.push('export const LEVELS_ORIGINAL: string[][] = [');
levels.forEach((rows, i) => {
  const rowStrs = rows.map(r => {
    // Escape backslashes and backticks just in case, then wrap in single quotes
    const escaped = r.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `    '${escaped}'`;
  });
  const trailing = i < levels.length - 1 ? ',' : '';
  lines.push(`  [`);
  lines.push(rowStrs.join(',\n'));
  lines.push(`  ]${trailing}`);
});
lines.push('];');
lines.push('');
lines.push(`export const OPTIMAL_MOVES_ORIGINAL: number[] = Array(${levels.length}).fill(0);`);
lines.push('');

fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf-8');
console.log(`Written ${levels.length} levels to ${OUT_PATH}`);
