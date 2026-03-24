/**
 * 从原始 XSB 源文件重建 levels.ts
 * 步骤：
 *   1. 解析4个源文件，得到干净的原始关卡
 *   2. 从现有 levels.ts 提取已计算的最优步数（按关卡内容匹配，不按序号）
 *   3. 旋转横长关卡（顺时针90°）
 *   4. 按最优步数排序（有解升序，无解放后）
 *   5. 写回 levels.ts
 */

const fs   = require('fs');
const path = require('path');

const LEVELS_FILE = path.join(__dirname, '../sokoban/src/config/levels.ts');
const SOURCE_FILES = [
  'docs/AlbertoG1-1.txt',
  'docs/AlbertoG1-2.txt',
  'docs/AlbertoG1-3.txt',
  'docs/AlbertoG-Best4U.txt',
].map(f => path.join(__dirname, '..', f));

// ── XSB 文件解析（同 parse-levels.js 逻辑）────────────────────────────────

function parseXSBFile(filepath) {
  const raw   = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const levels = [];
  let grid = [], pastHeader = false;

  for (const line of lines) {
    if (!pastHeader) {
      if (line.trim() === '') pastHeader = true;
      continue;
    }
    if (line.startsWith('Title:')) {
      const trimmed = trimGrid(grid);
      if (trimmed.length > 0 && trimmed.some(l => l.includes('#'))) levels.push(trimmed);
      grid = [];
    } else {
      grid.push(normalizeRow(line));
    }
  }
  const trimmed = trimGrid(grid);
  if (trimmed.length > 0 && trimmed.some(l => l.includes('#'))) levels.push(trimmed);
  return levels;
}

function trimGrid(grid) {
  const g = [...grid];
  while (g.length && g[0].trim() === '')              g.shift();
  while (g.length && g[g.length - 1].trim() === '')   g.pop();
  return g;
}

// AlbertoG1-1.txt 的每行被用户手动加了双引号，格式为 `"...row...",`
// 如果检测到这种格式，去掉外层引号；否则原样返回
function normalizeRow(row) {
  const m = row.match(/^"(.*?)",?$/);
  return m ? m[1] : row;
}

// ── 关卡内容标准化（用于匹配） ────────────────────────────────────────────

function levelKey(rows) {
  return rows.map(r => r.trimEnd()).join('\n');
}

// ── 顺时针旋转90° ─────────────────────────────────────────────────────────

function rotateCW(rows) {
  const numRows = rows.length;
  const numCols = Math.max(...rows.map(r => r.length));
  const padded  = rows.map(r => r.padEnd(numCols, ' '));
  const result  = [];
  for (let c = 0; c < numCols; c++) {
    let row = '';
    for (let r = numRows - 1; r >= 0; r--) row += padded[r][c];
    result.push(row.trimEnd());
  }
  return result;
}

// ── 逆时针旋转90°（CW的逆操作，用于还原匹配） ────────────────────────────

function rotateCCW(rows) {
  const numRows = rows.length;
  const numCols = Math.max(...rows.map(r => r.length));
  const padded  = rows.map(r => r.padEnd(numCols, ' '));
  const result  = [];
  for (let c = numCols - 1; c >= 0; c--) {
    let row = '';
    for (let r = 0; r < numRows; r++) row += padded[r][c];
    result.push(row.trimEnd());
  }
  return result;
}

// ── 步骤1：从现有 levels.ts 提取最优步数，建立"内容→步数"映射 ────────────

function buildOptimalMap(src) {
  // 解析现有关卡
  const blockRe = /\[\s*((?:"[^"]*",?\s*)+)\]/g;
  const curLevels = [];
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const rows = []; const rowRe = /"([^"]*)"/g; let r;
    while ((r = rowRe.exec(m[1])) !== null) rows.push(r[1]);
    if (rows.some(l => l.includes('#'))) curLevels.push(rows);
  }

  // 解析现有 OPTIMAL_MOVES
  const omBlock = src.match(/export const OPTIMAL_MOVES: number\[\] = \[([\s\S]*?)\];/)[1];
  const optMoves = omBlock.split('\n')
    .filter(l => l.trim().match(/^\d+,/))
    .map(l => parseInt(l.trim()));

  // 建立映射：level_key → optimal（original + CW + CCW 方向都存）
  const map = new Map();
  curLevels.forEach((rows, i) => {
    const opt = optMoves[i] ?? 0;
    if (opt <= 0) return;
    // 存原始方向
    map.set(levelKey(rows), opt);
    // 存CW和CCW（应对旋转过的版本）
    map.set(levelKey(rotateCW(rows)), opt);
    map.set(levelKey(rotateCCW(rows)), opt);
  });
  return map;
}

// ── 步骤2：校验关卡（箱子数=目标数） ────────────────────────────────────

function validateLevel(rows) {
  let boxes = 0, targets = 0;
  for (const row of rows) for (const ch of row) {
    if (ch === '$' || ch === '*') boxes++;
    if (ch === '.' || ch === '*' || ch === '+') targets++;
  }
  return boxes === targets;
}

// ── 主流程 ────────────────────────────────────────────────────────────────

const src = fs.readFileSync(LEVELS_FILE, 'utf8');

// 建立现有最优步数映射
const optMap = buildOptimalMap(src);
console.log(`现有最优步数记录: ${optMap.size / 3 | 0} 关（含旋转变体）`);

// 解析所有源文件
let allLevels = [];
for (const f of SOURCE_FILES) {
  const lvls = parseXSBFile(f);
  const name = path.basename(f);
  // 校验
  let bad = 0;
  for (const lv of lvls) if (!validateLevel(lv)) bad++;
  console.log(`${name}: ${lvls.length} 关${bad ? '，问题关' + bad : ''}`);
  allLevels = allLevels.concat(lvls);
}
console.log(`合计: ${allLevels.length} 关\n`);

// 过滤问题关卡
const validLevels = allLevels.filter(lv => {
  if (!validateLevel(lv)) {
    console.log('跳过问题关卡:', lv.join('|').slice(0, 60));
    return false;
  }
  return true;
});
console.log(`有效关卡: ${validLevels.length} 关`);

// 旋转横长关卡
let rotated = 0;
const orientedLevels = validLevels.map(rows => {
  const cols = Math.max(...rows.map(r => r.length));
  if (cols > rows.length) { rotated++; return rotateCW(rows); }
  return rows;
});
console.log(`旋转了 ${rotated} 关（横长→竖长）`);

// 查找最优步数
const levelData = orientedLevels.map(rows => {
  const key = levelKey(rows);
  const opt = optMap.get(key) ?? 0;
  return { rows, opt };
});

const solved   = levelData.filter(d => d.opt > 0);
const unsolved = levelData.filter(d => d.opt === 0);
console.log(`有最优解: ${solved.length} 关，无最优解: ${unsolved.length} 关`);

// 排序：有解升序，无解放后
solved.sort((a, b) => a.opt - b.opt);
const sorted = [...solved, ...unsolved];

// ── 重建 levels.ts ─────────────────────────────────────────────────────────

const levelsBlock = sorted.map(({ rows }, i) => {
  const rowStr = rows.map(r => `    "${r}",`).join('\n');
  return `  // ── 第 ${i + 1} 关 ────────────────────────────────────────────\n  [\n${rowStr}\n  ],`;
}).join('\n\n');

const omLines = sorted.map(({ opt }, i) => `  ${opt},   // ${i + 1}`).join('\n');

// 注意：用函数替换，避免替换字符串中 $$ 被 String.replace 解释为单个 $
const levelsReplacement = `export const LEVELS: string[][] = [\n${levelsBlock}\n];`;
const omReplacement     = `export const OPTIMAL_MOVES: number[] = [\n${omLines}\n];`;

let out = src
  .replace(/export const LEVELS: string\[\]\[\] = \[[\s\S]*?\n\];/, () => levelsReplacement)
  .replace(/export const OPTIMAL_MOVES: number\[\] = \[[\s\S]*?\];/, () => omReplacement);

fs.writeFileSync(LEVELS_FILE, out);

// 验证写回结果
const check = fs.readFileSync(LEVELS_FILE, 'utf8');
const blockRe2 = /\[\s*((?:"[^"]*",?\s*)+)\]/g;
let totalLevels = 0, m2;
while ((m2 = blockRe2.exec(check)) !== null) {
  const rows = []; const rr = /"([^"]*)"/g; let r;
  while ((r = rr.exec(m2[1])) !== null) rows.push(r[1]);
  if (rows.some(l => l.includes('#'))) totalLevels++;
}
const omCheck = check.match(/export const OPTIMAL_MOVES[^=]*=\s*\[([\s\S]*?)\];/)[1];
const omCount = omCheck.split('\n').filter(l => l.trim().match(/^\d+,/)).length;

console.log(`\n写回验证: 关卡数=${totalLevels}, OPTIMAL_MOVES=${omCount}`);
console.log('完成！');
