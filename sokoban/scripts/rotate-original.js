/**
 * 将 levels_original.ts 中横长竖短（cols > rows）的关卡旋转 90° 顺时针，
 * 使其变为竖长横短，适配手机竖屏。
 */

const fs   = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/config/levels_original.ts');
const src = fs.readFileSync(filePath, 'utf8');

// ── 解析关卡数组 ──────────────────────────────────────────────────────────────
// 文件格式：每个关卡是一个 [...] 块，每行是单引号字符串
function parseLevels(text) {
  const levels = [];
  // 匹配最外层的 LEVELS_ORIGINAL = [ ... ]
  const outer = text.match(/LEVELS_ORIGINAL: string\[\]\[\] = \[([\s\S]*?)\];\s*\n/);
  if (!outer) throw new Error('找不到 LEVELS_ORIGINAL');

  // 逐个提取 [ ... ] 关卡块
  const body = outer[1];
  const re = /\[([^\[\]]*?)\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const inner = m[1];
    const rows = [];
    const rowRe = /'([^']*)'/g;
    let rm;
    while ((rm = rowRe.exec(inner)) !== null) {
      rows.push(rm[1]);
    }
    if (rows.length > 0) levels.push(rows);
  }
  return levels;
}

// ── 旋转（90° 顺时针）────────────────────────────────────────────────────────
function rotateCW(rows) {
  const origR = rows.length;
  const origC = Math.max(...rows.map(r => r.length));

  // 补齐每行到相同宽度
  const grid = rows.map(r => r.padEnd(origC, ' '));

  // new[r][c] = old[origR-1-c][r]
  const newR = origC, newC = origR;
  const result = [];
  for (let r = 0; r < newR; r++) {
    let row = '';
    for (let c = 0; c < newC; c++) {
      row += grid[origR - 1 - c][r];
    }
    result.push(row.trimEnd());
  }
  return result;
}

function isLandscape(rows) {
  return Math.max(...rows.map(r => r.length)) > rows.length;
}

// ── 处理 ────────────────────────────────────────────────────────────────────
const levels = parseLevels(src);
console.log(`共 ${levels.length} 关`);

let rotatedCount = 0;
const processed = levels.map((rows, i) => {
  const w = Math.max(...rows.map(r => r.length));
  const h = rows.length;
  if (isLandscape(rows)) {
    rotatedCount++;
    console.log(`  第 ${i + 1} 关 旋转（${h}行 × ${w}列 → ${w}行 × ${h}列）`);
    return rotateCW(rows);
  }
  return rows;
});
console.log(`共旋转 ${rotatedCount} 关`);

// ── 生成输出 ─────────────────────────────────────────────────────────────────
let out = `// 今林宏行 原始关卡（Original + Extra，共90关）\n`;
out += `// 来源：Thinking Rabbit 1982\n`;
out += `// 横向关卡已旋转 90° 顺时针以适配手机竖屏\n\n`;
out += `export const LEVELS_ORIGINAL: string[][] = [\n`;

processed.forEach((rows, i) => {
  out += `  // ── 第 ${i + 1} 关\n`;
  out += `  [\n`;
  rows.forEach(row => { out += `    ${JSON.stringify(row)},\n`; });
  out += `  ],\n\n`;
});

out += `];\n\nexport const OPTIMAL_MOVES_ORIGINAL: number[] = Array(${processed.length}).fill(0);\n`;

fs.writeFileSync(filePath, out);
console.log(`已写入 ${filePath}`);
