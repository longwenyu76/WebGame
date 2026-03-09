import { GRID_COLS, GRID_ROWS } from '../constants/GameConstants';

export type FoodType = 'normal' | 'speed' | 'slow' | 'score';

export interface FoodItem {
  x: number;
  y: number;
  type: FoodType;
  spawnTime: number; // ms timestamp, for lifetime tracking in enhanced mode
}

export class FoodManager {
  private foods: FoodItem[] = [];

  get items(): readonly FoodItem[] { return this.foods; }

  hasNormalFood(): boolean {
    return this.foods.some(f => f.type === 'normal');
  }

  specialCount(): number {
    return this.foods.filter(f => f.type !== 'normal').length;
  }

  /**
   * Place a food of the given type at a random empty cell.
   * isOccupied(x, y) should return true for cells blocked by the snake.
   */
  placeFood(type: FoodType, isOccupied: (x: number, y: number) => boolean): void {
    let x: number, y: number;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * GRID_COLS);
      y = Math.floor(Math.random() * GRID_ROWS);
      if (++attempts > 500) return; // grid almost full
    } while (isOccupied(x, y) || this.foods.some(f => f.x === x && f.y === y));

    this.foods.push({ x, y, type, spawnTime: Date.now() });
  }

  /** Check and consume food at (x, y). Returns consumed item or null. */
  consume(x: number, y: number): FoodItem | null {
    const idx = this.foods.findIndex(f => f.x === x && f.y === y);
    if (idx === -1) return null;
    return this.foods.splice(idx, 1)[0];
  }

  /**
   * Remove expired special foods (lifetime in ms).
   * Returns number of foods removed.
   */
  removeExpired(lifetime: number): number {
    const now = Date.now();
    const before = this.foods.length;
    this.foods = this.foods.filter(
      f => f.type === 'normal' || (now - f.spawnTime) < lifetime
    );
    return before - this.foods.length;
  }

  clear(): void { this.foods = []; }
}
