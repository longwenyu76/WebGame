export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  readonly x: number;
  readonly y: number;
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

export class Snake {
  private cells: Cell[];
  private currentDir: Direction = 'right';
  private pendingDir: Direction = 'right';

  constructor(startX: number, startY: number) {
    // Initial length 3, facing right
    this.cells = [
      { x: startX,     y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
  }

  get head(): Cell    { return this.cells[0]; }
  get length(): number { return this.cells.length; }

  getCells(): readonly Cell[] { return this.cells; }

  /** Queue a direction change; ignores reversal attempts. */
  setDirection(dir: Direction): void {
    if (dir !== OPPOSITE[this.currentDir]) {
      this.pendingDir = dir;
    }
  }

  /** Returns next head position without mutating state. */
  peekNextHead(): Cell {
    const { x, y } = this.head;
    switch (this.pendingDir) {
      case 'up':    return { x,     y: y - 1 };
      case 'down':  return { x,     y: y + 1 };
      case 'left':  return { x: x - 1, y     };
      case 'right': return { x: x + 1, y     };
    }
  }

  /** Advance snake one step. grow=true keeps the tail (snake grew). */
  move(grow: boolean): void {
    this.currentDir = this.pendingDir;
    this.cells.unshift(this.peekNextHead());
    if (!grow) this.cells.pop();
  }
}
