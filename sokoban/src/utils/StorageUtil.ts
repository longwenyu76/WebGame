const KEY_PROGRESS = 'sokoban_progress';
const KEY_LAST     = 'sokoban_last_level';

export interface LevelRecord {
  completed: boolean;
  bestMoves: number;   // 0 = 未完成
  stars:     number;   // 0-3
}

export class StorageUtil {
  // ── 关卡记录 ──────────────────────────────────────────────────────────────

  static getRecord(level: number): LevelRecord {
    try {
      const raw = localStorage.getItem(`${KEY_PROGRESS}_${level}`);
      if (raw) return JSON.parse(raw) as LevelRecord;
    } catch { /* ignore */ }
    return { completed: false, bestMoves: 0, stars: 0 };
  }

  static saveRecord(level: number, moves: number, optimalMoves: number): void {
    const prev = this.getRecord(level);
    const bestMoves = prev.bestMoves === 0 ? moves : Math.min(prev.bestMoves, moves);

    let stars = 1;
    if (optimalMoves > 0) {
      if (moves <= Math.ceil(optimalMoves * 1.2)) stars = 3;
      else if (moves <= Math.ceil(optimalMoves * 1.5)) stars = 2;
    }
    stars = Math.max(stars, prev.stars);  // 不降低已有星级

    const record: LevelRecord = { completed: true, bestMoves, stars };
    try { localStorage.setItem(`${KEY_PROGRESS}_${level}`, JSON.stringify(record)); }
    catch { /* ignore */ }
  }

  // ── 最后关卡 ──────────────────────────────────────────────────────────────

  static getLastLevel(): number {
    try { return parseInt(localStorage.getItem(KEY_LAST) ?? '0', 10); }
    catch { return 0; }
  }

  static saveLastLevel(level: number): void {
    try { localStorage.setItem(KEY_LAST, String(level)); }
    catch { /* ignore */ }
  }
}
