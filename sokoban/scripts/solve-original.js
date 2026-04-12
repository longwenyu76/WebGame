'use strict';
/**
 * 对 levels_original.ts 求最优步数（Dijkstra，以推箱操作为节点，
 * 边权 = 玩家到推箱位所需步数 + 1）。
 *
 * 状态 = (玩家可达区域标准化位置, 箱子组合)
 * 避免了对每个玩家格独立建状态，状态空间缩小约 100 倍。
 *
 * 用法：node scripts/solve-original.js [超时秒数=60]
 */

const fs   = require('fs');
const path = require('path');

const TIMEOUT_SEC = parseInt(process.argv[2] ?? '60', 10);
const FILE = path.resolve(__dirname, '../src/config/levels_original.ts');

// ── 最小堆 ────────────────────────────────────────────────────────────────────
class MinHeap {
  constructor() { this.d = []; }
  push(x) { this.d.push(x); this._up(this.d.length - 1); }
  pop() {
    const t = this.d[0], l = this.d.pop();
    if (this.d.length) { this.d[0] = l; this._dn(0); }
    return t;
  }
  get size() { return this.d.length; }
  _up(i) {
    while (i > 0) {
      const p = (i-1)>>1;
      if (this.d[p][0] <= this.d[i][0]) break;
      [this.d[p], this.d[i]] = [this.d[i], this.d[p]]; i = p;
    }
  }
  _dn(i) {
    const n = this.d.length;
    for (;;) {
      let m = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.d[l][0] < this.d[m][0]) m = l;
      if (r < n && this.d[r][0] < this.d[m][0]) m = r;
      if (m === i) break;
      [this.d[m], this.d[i]] = [this.d[i], this.d[m]]; i = m;
    }
  }
}

// ── 解析 TS 文件 ──────────────────────────────────────────────────────────────
function parseLevels(src) {
  const outer = src.match(/LEVELS_ORIGINAL: string\[\]\[\] = \[([\s\S]*?)\];\s*\nexport/);
  if (!outer) throw new Error('找不到 LEVELS_ORIGINAL');
  const levels = [];
  const levelRe = /\[([^\[\]]+?)\]/g;
  let lm;
  while ((lm = levelRe.exec(outer[1])) !== null) {
    const rows = [];
    const rowRe = /["']([^"']*)["']/g;
    let rm;
    while ((rm = rowRe.exec(lm[1])) !== null) rows.push(rm[1]);
    if (rows.length > 0) levels.push(rows);
  }
  return levels;
}

// ── 方向 ─────────────────────────────────────────────────────────────────────
const DR = [-1, 1, 0, 0];
const DC = [0, 0, -1, 1];

// ── 求解器 ────────────────────────────────────────────────────────────────────
function solve(rows, timeoutMs) {
  const H = rows.length;
  const W = Math.max(...rows.map(r => r.length));
  const SZ = H * W;

  const wall = new Uint8Array(SZ);
  let pPos = -1;
  const initBoxes = [], targets = [];

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const p = r * W + c;
      switch ((rows[r] || '')[c] || ' ') {
        case '#': wall[p] = 1; break;
        case '@': pPos = p; break;
        case '+': pPos = p; targets.push(p); break;
        case '$': initBoxes.push(p); break;
        case '*': initBoxes.push(p); targets.push(p); break;
        case '.': targets.push(p); break;
      }
    }
  }
  if (pPos < 0 || !initBoxes.length) return null;

  const targetSet = new Set(targets);

  // ── 预计算：各格到最近目标的 BFS 距离（启发下界）──────────────────────────
  const h2tgt = new Int32Array(SZ).fill(0x7fff);
  {
    const q = new Int32Array(SZ); let head = 0, tail = 0;
    for (const t of targets) { h2tgt[t] = 0; q[tail++] = t; }
    while (head < tail) {
      const p = q[head++];
      const pr = Math.floor(p/W), pc = p%W;
      for (let d = 0; d < 4; d++) {
        const nr = pr+DR[d], nc = pc+DC[d];
        if (nr<0||nr>=H||nc<0||nc>=W) continue;
        const np = nr*W+nc;
        if (wall[np] || h2tgt[np] < 0x7fff) continue;
        h2tgt[np] = h2tgt[p]+1; q[tail++] = np;
      }
    }
  }

  // 死区（无论如何都到不了任何目标）
  const dead = new Uint8Array(SZ);
  for (let p = 0; p < SZ; p++) if (!wall[p] && h2tgt[p] === 0x7fff) dead[p] = 1;

  // 角落死局（两面互相垂直的墙，且非目标）
  const cornerDead = new Uint8Array(SZ);
  for (let r = 1; r < H-1; r++) for (let c = 1; c < W-1; c++) {
    const p = r*W+c;
    if (wall[p] || targetSet.has(p)) continue;
    const wV = wall[(r-1)*W+c] || wall[(r+1)*W+c];
    const wH = wall[r*W+c-1]   || wall[r*W+c+1];
    if (wV && wH) cornerDead[p] = 1;
  }

  // ── 启发函数：所有非目标箱子到最近目标距离之和 ───────────────────────────
  function heur(boxArr) {
    let s = 0;
    for (const b of boxArr) if (!targetSet.has(b)) s += h2tgt[b];
    return s;
  }
  function isGoal(boxArr) { return boxArr.every(b => targetSet.has(b)); }
  function bkey(arr)       { return arr.join(','); }

  // ── BFS（玩家可达范围 + 距离），箱子视为墙 ─────────────────────────────────
  const _dist = new Int32Array(SZ);
  const _q    = new Int32Array(SZ);
  function flood(start, boxSet) {
    _dist.fill(-1);
    _dist[start] = 0;
    _q[0] = start; let head = 0, tail = 1;
    while (head < tail) {
      const p = _q[head++];
      const pr = Math.floor(p/W), pc = p%W;
      for (let d = 0; d < 4; d++) {
        const nr = pr+DR[d], nc = pc+DC[d];
        if (nr<0||nr>=H||nc<0||nc>=W) continue;
        const np = nr*W+nc;
        if (wall[np]||boxSet.has(np)||_dist[np]>=0) continue;
        _dist[np] = _dist[p]+1; _q[tail++] = np;
      }
    }
  }

  // 可达区域标准化：返回最小可达坐标（区分不同"玩家区域"）
  function canon(start, boxSet) {
    flood(start, boxSet);
    for (let p = 0; p < SZ; p++) if (_dist[p] >= 0) return p;
    return start;
  }

  // ── Dijkstra / A* 搜索 ───────────────────────────────────────────────────
  const initArr = [...initBoxes].sort((a,b)=>a-b);
  if (isGoal(initArr)) return 0;

  const distMap = new Map(); // 状态 key → 最小 g
  const heap    = new MinHeap();

  const initBoxSet = new Set(initArr);
  const initCanon  = canon(pPos, initBoxSet);
  const initKey    = initCanon + '|' + bkey(initArr);
  distMap.set(initKey, 0);
  heap.push([heur(initArr), 0, pPos, initArr]);

  const t0 = Date.now();
  let iters = 0;

  while (heap.size > 0) {
    if ((++iters & 0x1FFF) === 0 && Date.now() - t0 > timeoutMs) return null;

    const [, g, p, boxArr] = heap.pop();

    // 验证：当前节点是否仍是最优路径
    const boxSet = new Set(boxArr);
    flood(p, boxSet);
    const cp = (() => { for (let i=0;i<SZ;i++) if(_dist[i]>=0) return i; return p; })();
    const k = cp + '|' + bkey(boxArr);
    const best = distMap.get(k);
    if (best !== undefined && best < g) continue;

    // 枚举所有有效推箱操作
    // 把 BFS 结果复制出来（flood 会在 canon 调用时被覆盖）
    const pDist = _dist.slice();

    for (let bi = 0; bi < boxArr.length; bi++) {
      const bPos = boxArr[bi];
      const br = Math.floor(bPos/W), bc = bPos%W;

      for (let d = 0; d < 4; d++) {
        // 玩家推箱时站在箱子的反方向
        const pfr = br - DR[d], pfc = bc - DC[d];
        if (pfr<0||pfr>=H||pfc<0||pfc>=W) continue;
        const pfPos = pfr*W+pfc;
        if (wall[pfPos]) continue;
        if (pDist[pfPos] < 0) continue; // 玩家无法到达推箱位置

        // 箱子新位置
        const nbr = br+DR[d], nbc = bc+DC[d];
        if (nbr<0||nbr>=H||nbc<0||nbc>=W) continue;
        const nbPos = nbr*W+nbc;
        if (wall[nbPos]||boxSet.has(nbPos)) continue;
        if (dead[nbPos]) continue;
        if (cornerDead[nbPos] && !targetSet.has(nbPos)) continue;

        const newBoxArr = boxArr.map((b,i) => i===bi ? nbPos : b);
        newBoxArr.sort((a,b)=>a-b);

        const ng = g + pDist[pfPos] + 1; // 到推箱位步数 + 1（推这一步）
        if (isGoal(newBoxArr)) return ng;

        const newBoxSet = new Set(newBoxArr);
        const newCanon  = canon(bPos, newBoxSet); // 推完后玩家在 bPos（原箱位）
        const nk = newCanon + '|' + bkey(newBoxArr);
        const prev = distMap.get(nk);
        if (prev !== undefined && prev <= ng) continue;
        distMap.set(nk, ng);

        heap.push([ng + heur(newBoxArr), ng, bPos, newBoxArr]);
      }
    }
  }
  return null;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
const src    = fs.readFileSync(FILE, 'utf8');
const levels = parseLevels(src);
console.log(`共 ${levels.length} 关，每关超时 ${TIMEOUT_SEC} 秒\n`);

const optMoves = new Array(levels.length).fill(0);
let solved = 0, timedOut = 0;

for (let i = 0; i < levels.length; i++) {
  const label = `第 ${String(i+1).padStart(2)} 关`;
  process.stdout.write(`${label}  ...`);
  const t0  = Date.now();
  const res = solve(levels[i], TIMEOUT_SEC * 1000);
  const sec = ((Date.now()-t0)/1000).toFixed(1);
  if (res !== null) {
    optMoves[i] = res; solved++;
    process.stdout.write(`\r${label}  ${res} 步  (${sec}s)\n`);
  } else {
    const elapsed = Date.now()-t0;
    if (elapsed >= TIMEOUT_SEC*1000-200) timedOut++;
    process.stdout.write(`\r${label}  ${elapsed >= TIMEOUT_SEC*1000-200 ? '超时' : '无解'}\n`);
  }
}

console.log(`\n已解 ${solved} / ${levels.length}，超时 ${timedOut}`);

// ── 写回文件 ──────────────────────────────────────────────────────────────────
const newLine = `export const OPTIMAL_MOVES_ORIGINAL: number[] = [\n  ${optMoves.join(', ')},\n];`;
const newSrc  = src.replace(/export const OPTIMAL_MOVES_ORIGINAL[\s\S]*?;/, newLine);
if (newSrc === src) {
  console.error('警告：未找到 OPTIMAL_MOVES_ORIGINAL，文件未修改');
} else {
  fs.writeFileSync(FILE, newSrc);
  console.log('已写入 levels_original.ts');
}
