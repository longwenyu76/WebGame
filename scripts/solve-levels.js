/**
 * Sokoban A* 最优解求解器（改进版）
 * 改进点：
 *   1. 预计算"死格表"（反向BFS），比单纯角落检测强得多
 *   2. 启发函数改用"最少推动次数"下界，比曼哈顿距离更紧
 * 用法：node scripts/solve-levels.js
 */

const fs   = require('fs');
const path = require('path');

const LEVELS_FILE = path.join(__dirname, '../sokoban/src/config/levels.ts');
const MAX_STATES  = 10_000_000;  // 每关最多探索状态数（Node.js Set 上限约1600万）
const TIMEOUT_MS  = 600_000;     // 每关超时（毫秒）= 10分钟

// ── 解析 levels.ts 中的关卡数组 ───────────────────────────────────────────

function parseLevelsTs(content) {
  const levels = [];
  const blockRe = /\[\s*((?:"[^"]*",?\s*)+)\]/g;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    const rows = [];
    const rowRe = /"([^"]*)"/g;
    let r;
    while ((r = rowRe.exec(m[1])) !== null) rows.push(r[1]);
    if (rows.length > 0 && rows.some(l => l.includes('#'))) levels.push(rows);
  }
  return levels;
}

// ── 解析关卡数据 ──────────────────────────────────────────────────────────

function parseLevel(rows) {
  let player = null;
  const boxes   = [];
  const targets = new Set();
  const walls   = new Set();

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      if (ch === '@' || ch === '+') player = [r, c];
      if (ch === '$' || ch === '*') boxes.push([r, c]);
      if (ch === '.' || ch === '*' || ch === '+') targets.add(r * 1000 + c);
      if (ch === '#')                              walls.add(r * 1000 + c);
    }
  }
  return { player, boxes, targets, walls };
}

// ── 状态哈希 ─────────────────────────────────────────────────────────────

function stateKey(pr, pc, boxes) {
  const sorted = [...boxes].sort((a, b) => a - b);
  return `${pr},${pc}|${sorted.join(',')}`;
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ── 预计算死格表 + 最短推动距离 ───────────────────────────────────────────
//
// 反向BFS：把"箱子推到目标"倒过来看，从目标出发反向"拉"箱子。
// 状态：(boxR, boxC, pushDir)  — 箱子位置 + 最后一次被推的方向
//   反向展开时，玩家站在箱子对面，把箱子"拉"回来一格。
//
// 返回：minPushDist[r * 1000 + c] = 从位置(r,c)推到最近目标的最少推动次数
//        若该格子是死格（永远推不到任何目标），则该键不存在。

function computePushDist(targets, walls) {
  // 状态编码：pos * 4 + dir
  const dist = new Map();   // key = pos*4+dir → 最少推动次数
  const queue = [];
  let head = 0;

  // 初始状态：箱子已在目标点，推动次数=0，方向任意（用-1表示"初始"）
  for (const t of targets) {
    for (let d = 0; d < 4; d++) {
      const key = t * 4 + d;
      if (!dist.has(key)) {
        dist.set(key, 0);
        queue.push([t, d, 0]);
      }
    }
  }

  while (head < queue.length) {
    const [bk, , pushes] = queue[head++];
    const br = Math.floor(bk / 1000), bc = bk % 1000;

    for (let d = 0; d < 4; d++) {
      const [dr, dc] = DIRS[d];
      // 反向：箱子从 (br-dr, bc-dc) 被推到 (br, bc)
      // 玩家站在 (br-2*dr, bc-2*dc)
      const fromR = br - dr, fromC = bc - dc;
      const playerR = br - 2*dr, playerC = bc - 2*dc;
      const fromK = fromR * 1000 + fromC;
      const playerK = playerR * 1000 + playerC;

      if (walls.has(fromK) || walls.has(playerK)) continue;

      const key = fromK * 4 + d;
      if (!dist.has(key)) {
        dist.set(key, pushes + 1);
        queue.push([fromK, d, pushes + 1]);
      }
    }
  }

  // 从 (pos, dir) 距离 → 每个格子的最小推动距离（取四个方向的最小值）
  const minDist = new Map();  // pos → 最少推动次数
  for (const [key, d] of dist) {
    const pos = Math.floor(key / 4);
    if (!minDist.has(pos) || minDist.get(pos) > d) minDist.set(pos, d);
  }

  return minDist;  // 不在 map 里的格子 = 死格
}

// ── 死锁检测（基于预计算死格表）─────────────────────────────────────────

function hasDeadlock(boxes, targets, minDist) {
  for (const b of boxes) {
    if (targets.has(b)) continue;
    if (!minDist.has(b)) return true;   // 死格：永远推不到目标
  }
  return false;
}

// ── 启发函数：各箱子到最近目标的最少推动次数之和 ────────────────────────
// 推动次数 ≤ 移动步数，因此是移动步数的下界（可容许启发）

function heuristic(boxes, targets, minDist) {
  let h = 0;
  for (const b of boxes) {
    if (targets.has(b)) continue;
    h += minDist.get(b) ?? 999999;
  }
  return h;
}

// ── 最小堆（A* 优先队列）─────────────────────────────────────────────────

class MinHeap {
  constructor() { this.data = []; }
  get size() { return this.data.length; }
  push(item) { this.data.push(item); this._up(this.data.length - 1); }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._down(0); }
    return top;
  }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p][0] <= this.data[i][0]) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }
  _down(i) {
    const n = this.data.length;
    while (true) {
      let m = i;
      const l = 2*i+1, r = 2*i+2;
      if (l < n && this.data[l][0] < this.data[m][0]) m = l;
      if (r < n && this.data[r][0] < this.data[m][0]) m = r;
      if (m === i) break;
      [this.data[m], this.data[i]] = [this.data[i], this.data[m]];
      i = m;
    }
  }
}

// ── A* 求解 ───────────────────────────────────────────────────────────────

function solve(rows) {
  const { player, boxes, targets, walls } = parseLevel(rows);
  if (!player || boxes.length === 0) return null;

  const initBoxes = boxes.map(([r, c]) => r * 1000 + c);
  const isComplete = (bxs) => bxs.every(b => targets.has(b));
  if (isComplete(initBoxes)) return 0;

  // 预计算死格表和最短推动距离（每关只算一次）
  const minDist = computePushDist(targets, walls);

  const startTime = Date.now();
  const visited   = new Set();

  const initH = heuristic(initBoxes, targets, minDist);
  if (initH >= 999999) return null;   // 初始状态就有死格

  const heap = new MinHeap();
  heap.push([initH, 0, player[0], player[1], initBoxes]);
  visited.add(stateKey(player[0], player[1], initBoxes));

  while (heap.size > 0) {
    if (Date.now() - startTime > TIMEOUT_MS) return null;
    if (visited.size          > MAX_STATES)  return null;

    const [, g, pr, pc, bxs] = heap.pop();

    for (const [dr, dc] of DIRS) {
      const nr = pr + dr;
      const nc = pc + dc;
      const nk = nr * 1000 + nc;

      if (walls.has(nk)) continue;

      const boxIdx = bxs.indexOf(nk);
      let newBxs = bxs;

      if (boxIdx !== -1) {
        const br = nr + dr;
        const bc = nc + dc;
        const bk = br * 1000 + bc;
        if (walls.has(bk))    continue;
        if (bxs.includes(bk)) continue;

        newBxs = [...bxs];
        newBxs[boxIdx] = bk;

        if (hasDeadlock(newBxs, targets, minDist)) continue;
      }

      const sk = stateKey(nr, nc, newBxs);
      if (visited.has(sk)) continue;
      visited.add(sk);

      const newG = g + 1;
      if (isComplete(newBxs)) return newG;

      const h = heuristic(newBxs, targets, minDist);
      heap.push([newG + h, newG, nr, nc, newBxs]);
    }
  }

  return null;
}

// ── 主逻辑：读取 → 求解 → 写回 ───────────────────────────────────────────

const content = fs.readFileSync(LEVELS_FILE, 'utf8');
const levels  = parseLevelsTs(content);

console.log(`共 ${levels.length} 关，开始求解（A* + 死格剪枝）...\n`);

const optMatch = content.match(/export const OPTIMAL_MOVES: number\[\] = \[([\s\S]*?)\];/);
const existing = optMatch
  ? optMatch[1].split('\n')
      .filter(l => l.trim().match(/^\d+,/))
      .map(l => parseInt(l.trim()))
  : new Array(levels.length).fill(0);

while (existing.length < levels.length) existing.push(0);

let solvedCount = 0;
let skipCount   = 0;

for (let i = 0; i < levels.length; i++) {
  if (existing[i] > 0) {
    console.log(`第 ${String(i + 1).padStart(3)} 关  已有最优: ${existing[i]} 步（跳过）`);
    continue;
  }

  process.stdout.write(`第 ${String(i + 1).padStart(3)} 关  求解中...`);
  const t0  = Date.now();
  const opt = solve(levels[i]);
  const ms  = Date.now() - t0;

  if (opt !== null) {
    existing[i] = opt;
    solvedCount++;
    process.stdout.write(` → ${opt} 步  (${ms}ms)\n`);
  } else {
    skipCount++;
    process.stdout.write(` → 超时/复杂，跳过  (${ms}ms)\n`);
  }
}

console.log(`\n完成：新求解 ${solvedCount} 关，跳过 ${skipCount} 关`);

// ── 写回 levels.ts ────────────────────────────────────────────────────────

const newArray = existing.map((v, i) => `  ${v},   // ${i + 1}`).join('\n');
const updated  = content.replace(
  /export const OPTIMAL_MOVES: number\[\] = \[[\s\S]*?\];/,
  `export const OPTIMAL_MOVES: number[] = [\n${newArray}\n];`
);

fs.writeFileSync(LEVELS_FILE, updated);
console.log('已写回 levels.ts');
