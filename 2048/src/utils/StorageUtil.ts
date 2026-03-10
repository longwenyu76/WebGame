import { STORAGE_KEYS } from '../constants/GameConstants';

export interface SavedGame {
  cells:  (number | null)[][];   // 4×4, null = empty
  ids:    (number | null)[][];   // tile IDs matching cells
  score:  number;
  nextId: number;
  won:    boolean;               // already shown win dialog
}

export const StorageUtil = {
  getHighScore(): number {
    return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) ?? '0', 10) || 0;
  },

  saveHighScore(score: number): void {
    if (score > this.getHighScore()) {
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(score));
    }
  },

  getCurrentGame(): SavedGame | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    if (!raw) return null;
    try { return JSON.parse(raw) as SavedGame; } catch { return null; }
  },

  saveCurrentGame(data: SavedGame): void {
    try { localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, JSON.stringify(data)); } catch { /* ignore */ }
  },

  clearCurrentGame(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
  },
};
