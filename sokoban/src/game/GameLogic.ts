// XSB 格式：# 墙  @ 玩家  $ 箱子  . 目标点  * 箱子在目标点  + 玩家在目标点    空地
export type Cell = '#' | '@' | '$' | '.' | '*' | '+' | ' ';

export interface MoveResult {
  moved:  boolean;
  pushed: boolean;
  won:    boolean;
}

interface Snapshot {
  grid:   Cell[][];
  moves:  number;
  pushes: number;
  pRow:   number;
  pCol:   number;
}

export class GameLogic {
  private initial: Cell[][];
  private grid:    Cell[][];
  private history: Snapshot[] = [];

  readonly rows:     number;
  readonly cols:     number;
  readonly numBoxes: number;

  moves:  number = 0;
  pushes: number = 0;
  pRow:   number = 0;
  pCol:   number = 0;

  constructor(levelData: string[]) {
    this.rows = levelData.length;
    this.cols = Math.max(...levelData.map(r => r.length));

    this.initial = levelData.map(row =>
      row.padEnd(this.cols, ' ').split('') as Cell[]
    );
    this.grid = this.cloneGrid(this.initial);

    let numBoxes = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell === '@' || cell === '+') { this.pRow = r; this.pCol = c; }
        if (cell === '$' || cell === '*') numBoxes++;
      }
    }
    this.numBoxes = numBoxes;
  }

  // ── 移动 ──────────────────────────────────────────────────────────────────

  move(dr: number, dc: number): MoveResult {
    const nr = this.pRow + dr;
    const nc = this.pCol + dc;
    const dest = this.get(nr, nc);

    if (dest === '#') return { moved: false, pushed: false, won: false };

    let pushed = false;

    if (dest === '$' || dest === '*') {
      // 尝试推箱子
      const br = nr + dr;
      const bc = nc + dc;
      const beyond = this.get(br, bc);
      if (beyond === '#' || beyond === '$' || beyond === '*') {
        return { moved: false, pushed: false, won: false };
      }

      // 保存状态
      this.saveSnapshot();

      // 移动箱子
      const boxOnTarget = dest === '*';
      this.set(nr, nc, boxOnTarget ? '.' : ' ');           // 清除箱子
      this.set(br, bc, beyond === '.' ? '*' : '$');         // 放置箱子
      pushed = true;
      this.pushes++;
    } else {
      this.saveSnapshot();
    }

    // 移动玩家
    const playerOnTarget = this.get(this.pRow, this.pCol) === '+';
    this.set(this.pRow, this.pCol, playerOnTarget ? '.' : ' ');

    const destNow = this.get(nr, nc);
    this.set(nr, nc, destNow === '.' ? '+' : '@');

    this.pRow = nr;
    this.pCol = nc;
    this.moves++;

    return { moved: true, pushed, won: this.isComplete() };
  }

  // ── 撤销 ──────────────────────────────────────────────────────────────────

  undo(): boolean {
    if (this.history.length === 0) return false;
    const snap = this.history.pop()!;
    this.grid   = snap.grid;
    this.moves  = snap.moves;
    this.pushes = snap.pushes;
    this.pRow   = snap.pRow;
    this.pCol   = snap.pCol;
    return true;
  }

  canUndo(): boolean { return this.history.length > 0; }

  // ── 重置 ──────────────────────────────────────────────────────────────────

  reset(): void {
    this.grid    = this.cloneGrid(this.initial);
    this.history = [];
    this.moves   = 0;
    this.pushes  = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell === '@' || cell === '+') { this.pRow = r; this.pCol = c; }
      }
  }

  // ── 查询 ──────────────────────────────────────────────────────────────────

  getCell(r: number, c: number): Cell { return this.get(r, c); }

  isComplete(): boolean {
    // 没有任何箱子在非目标点上
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c] === '$') return false;
    return true;
  }

  boxesOnTarget(): number {
    let n = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c] === '*') n++;
    return n;
  }

  // ── 内部工具 ──────────────────────────────────────────────────────────────

  private get(r: number, c: number): Cell {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return '#';
    return this.grid[r][c];
  }

  private set(r: number, c: number, cell: Cell): void {
    this.grid[r][c] = cell;
  }

  private cloneGrid(g: Cell[][]): Cell[][] {
    return g.map(row => [...row]);
  }

  private saveSnapshot(): void {
    this.history.push({
      grid:   this.cloneGrid(this.grid),
      moves:  this.moves,
      pushes: this.pushes,
      pRow:   this.pRow,
      pCol:   this.pCol,
    });
  }
}
