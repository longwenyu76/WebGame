const KEY_PROGRESS = 'sokoban_progress';
const KEY_LAST     = 'sokoban_last_level';
const KEY_LAST_SET = 'sokoban_last_set';

export interface LevelRecord {
  completed: boolean;
  bestMoves: number;
  stars:     number;
}

export class StorageUtil {
  private static progressKey(setId: string, level: number): string {
    return setId === 'alberto'
      ? `${KEY_PROGRESS}_${level}`
      : `sokoban_${setId}_progress_${level}`;
  }

  static getRecord(setId: string, level: number): LevelRecord {
    try {
      const raw = localStorage.getItem(this.progressKey(setId, level));
      if (raw) return JSON.parse(raw) as LevelRecord;
    } catch { /* ignore */ }
    return { completed: false, bestMoves: 0, stars: 0 };
  }

  static saveRecord(setId: string, level: number, moves: number, optimalMoves: number): void {
    const prev = this.getRecord(setId, level);
    const bestMoves = prev.bestMoves === 0 ? moves : Math.min(prev.bestMoves, moves);

    let stars = 1;
    if (optimalMoves > 0) {
      if (moves <= Math.ceil(optimalMoves * 1.2)) stars = 3;
      else if (moves <= Math.ceil(optimalMoves * 1.5)) stars = 2;
    }
    stars = Math.max(stars, prev.stars);

    const record: LevelRecord = { completed: true, bestMoves, stars };
    try { localStorage.setItem(this.progressKey(setId, level), JSON.stringify(record)); }
    catch { /* ignore */ }
  }

  static getLastLevel(setId = 'alberto'): number {
    const key = setId === 'alberto' ? KEY_LAST : `sokoban_${setId}_last_level`;
    try { return parseInt(localStorage.getItem(key) ?? '0', 10); }
    catch { return 0; }
  }

  static saveLastLevel(setId: string, level: number): void {
    const key = setId === 'alberto' ? KEY_LAST : `sokoban_${setId}_last_level`;
    try { localStorage.setItem(key, String(level)); }
    catch { /* ignore */ }
  }

  static getLastSetIndex(): number {
    try { return parseInt(localStorage.getItem(KEY_LAST_SET) ?? '0', 10); }
    catch { return 0; }
  }

  static saveLastSetIndex(i: number): void {
    try { localStorage.setItem(KEY_LAST_SET, String(i)); }
    catch { /* ignore */ }
  }
}
