/**
 * 解析 XSB 格式关卡文件，输出 TypeScript 数组片段
 * 用法：node scripts/parse-levels.js <file1> [file2] ...
 */
const fs   = require('fs');
const path = require('path');

function parseFile(filepath) {
  const raw   = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const levels = [];
  let grid     = [];
  let pastHeader = false;

  for (const line of lines) {
    // 文件头：跳过到第一个空行
    if (!pastHeader) {
      if (line.trim() === '') { pastHeader = true; }
      continue;
    }

    if (line.startsWith('Title:')) {
      // 保存已收集的关卡（去掉首尾空行）
      while (grid.length && grid[0].trim() === '')              grid.shift();
      while (grid.length && grid[grid.length - 1].trim() === '') grid.pop();
      if (grid.length > 0 && grid.some(l => l.includes('#'))) {
        levels.push(grid);
      }
      grid = [];
    } else {
      grid.push(line);
    }
  }

  // 文件末尾没有 Title 行时保存最后一关
  while (grid.length && grid[0].trim() === '')              grid.shift();
  while (grid.length && grid[grid.length - 1].trim() === '') grid.pop();
  if (grid.length > 0 && grid.some(l => l.includes('#'))) {
    levels.push(grid);
  }

  return levels;
}

function formatLevel(grid, index) {
  const rows = grid.map(r => `    "${r.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",`).join('\n');
  return `  // ── 第 ${index} 关 ────────────────────────────────────────────\n  [\n${rows}\n  ],`;
}

// ── 主逻辑 ───────────────────────────────────────────────────────────────────

const files  = process.argv.slice(2);
if (!files.length) {
  console.error('用法: node parse-levels.js <file1> [file2] ...');
  process.exit(1);
}

let allLevels = [];
for (const f of files) {
  const lvls = parseFile(f);
  console.error(`${path.basename(f)}: 解析到 ${lvls.length} 关`);
  allLevels = allLevels.concat(lvls);
}

console.error(`合计: ${allLevels.length} 关`);

// 输出 TS 片段（关卡从指定起始编号开始，默认 1）
const startNum = parseInt(process.env.START || '1', 10);
const parts = allLevels.map((g, i) => formatLevel(g, startNum + i));
console.log(parts.join('\n\n'));
