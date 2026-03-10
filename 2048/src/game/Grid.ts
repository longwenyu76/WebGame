import { GRID_SIZE } from '../constants/GameConstants';

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Describes what happened to one tile during a move. */
export interface TileMove {
  id:       number;
  fromRow:  number;
  fromCol:  number;
  toRow:    number;
  toCol:    number;
  newValue: number;
  /** true = this tile slides into another tile and is removed. */
  absorbed: boolean;
}

export interface MoveResult {
  moved:   boolean;
  moves:   TileMove[];
  score:   number;
  /** The newly spawned tile after the move, or null if no empty cell. */
  newTile: { row: number; col: number; value: number; id: number } | null;
}

interface Cell {
  value: number;
  id:    number;
}

export interface GridSnapshot {
  cells:  (Cell | null)[][];
  nextId: number;
}

export class Grid {
  private cells:  (Cell | null)[][];
  private nextId: number;

  constructor(snapshot?: GridSnapshot) {
    if (snapshot) {
      this.cells  = snapshot.cells.map(r => r.map(c => c ? { ...c } : null));
      this.nextId = snapshot.nextId;
    } else {
      this.cells  = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
      this.nextId = 1;
    }
  }

  /** Deep-copy current state for undo/save. */
  snapshot(): GridSnapshot {
    return {
      cells:  this.cells.map(r => r.map(c => c ? { ...c } : null)),
      nextId: this.nextId,
    };
  }

  getCellValue(row: number, col: number): number {
    return this.cells[row][col]?.value ?? 0;
  }

  getCellId(row: number, col: number): number | null {
    return this.cells[row][col]?.id ?? null;
  }

  /** Returns all (row, col) with non-null cells. */
  filledCells(): { row: number; col: number; value: number; id: number }[] {
    const out: { row: number; col: number; value: number; id: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (this.cells[r][c]) out.push({ row: r, col: c, ...this.cells[r][c]! });
    return out;
  }

  /** Spawn a new random tile (90% → 2, 10% → 4). Returns info or null if full. */
  addRandom(): { row: number; col: number; value: number; id: number } | null {
    const empty: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (!this.cells[r][c]) empty.push({ row: r, col: c });
    if (!empty.length) return null;

    const pos   = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const id    = this.nextId++;
    this.cells[pos.row][pos.col] = { value, id };
    return { row: pos.row, col: pos.col, value, id };
  }

  /**
   * Move all tiles in the given direction.
   * Returns the list of per-tile animations and the new random tile.
   */
  move(dir: Direction): MoveResult {
    const before = this.snapshot();
    const moves: TileMove[] = [];
    let score = 0;

    // We normalize everything to "move toward index 0 in the line".
    // For each of the 4 lines, we call the core merge logic.
    for (let i = 0; i < GRID_SIZE; i++) {
      // Collect non-null tiles with their original j-index
      const line: { cell: Cell; j: number }[] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        const c = this.getLineCell(dir, i, j);
        if (c) line.push({ cell: c, j });
      }

      // Clear line
      for (let j = 0; j < GRID_SIZE; j++) this.setLineCell(dir, i, j, null);

      // Merge toward j=0
      let target = 0;
      let p = 0;
      while (p < line.length) {
        const fromRC = this.lineToRC(dir, i, line[p].j);

        if (
          p + 1 < line.length &&
          line[p].cell.value === line[p + 1].cell.value
        ) {
          // Merge
          const newVal = line[p].cell.value * 2;
          score += newVal;
          const survivorId = line[p].cell.id;
          const victimId   = line[p + 1].cell.id;
          const toRC       = this.lineToRC(dir, i, target);
          const from2RC    = this.lineToRC(dir, i, line[p + 1].j);

          this.setLineCell(dir, i, target, { value: newVal, id: survivorId });

          moves.push({ id: survivorId, fromRow: fromRC.row, fromCol: fromRC.col,
            toRow: toRC.row, toCol: toRC.col, newValue: newVal, absorbed: false });
          moves.push({ id: victimId, fromRow: from2RC.row, fromCol: from2RC.col,
            toRow: toRC.row, toCol: toRC.col, newValue: line[p + 1].cell.value, absorbed: true });
          p += 2;
        } else {
          const toRC = this.lineToRC(dir, i, target);
          this.setLineCell(dir, i, target, { ...line[p].cell });
          moves.push({ id: line[p].cell.id, fromRow: fromRC.row, fromCol: fromRC.col,
            toRow: toRC.row, toCol: toRC.col, newValue: line[p].cell.value, absorbed: false });
          p += 1;
        }
        target++;
      }
    }

    // If nothing actually moved, restore and return
    const moved = moves.some(m =>
      m.fromRow !== m.toRow || m.fromCol !== m.toCol || m.absorbed
    );
    if (!moved) {
      // Restore (cells are already updated in-place but since nothing moved they're the same)
      this.cells  = before.cells.map(r => r.map(c => c ? { ...c } : null));
      this.nextId = before.nextId;
      return { moved: false, moves: [], score: 0, newTile: null };
    }

    const newTile = this.addRandom();
    return { moved, moves, score, newTile };
  }

  /** Returns true if any valid move exists. */
  canMove(): boolean {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!this.cells[r][c]) return true;
        const v = this.cells[r][c]!.value;
        if (c + 1 < GRID_SIZE && this.cells[r][c + 1]?.value === v) return true;
        if (r + 1 < GRID_SIZE && this.cells[r + 1][c]?.value === v) return true;
      }
    }
    return false;
  }

  /** Returns true if any cell has the given value. */
  hasValue(v: number): boolean {
    return this.cells.some(row => row.some(c => c?.value === v));
  }

  // ── Line accessors ───────────────────────────────────────────────────────────
  // For each direction we map (i=line index, j=position along line) to (row, col).
  // "Move toward j=0" = move left, up, etc.

  private lineToRC(dir: Direction, i: number, j: number): { row: number; col: number } {
    switch (dir) {
      case 'left':  return { row: i, col: j };
      case 'right': return { row: i, col: GRID_SIZE - 1 - j };
      case 'up':    return { row: j, col: i };
      case 'down':  return { row: GRID_SIZE - 1 - j, col: i };
    }
  }

  private getLineCell(dir: Direction, i: number, j: number): Cell | null {
    const { row, col } = this.lineToRC(dir, i, j);
    return this.cells[row][col];
  }

  private setLineCell(dir: Direction, i: number, j: number, c: Cell | null): void {
    const { row, col } = this.lineToRC(dir, i, j);
    this.cells[row][col] = c;
  }
}
