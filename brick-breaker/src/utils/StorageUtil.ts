import { STORAGE_KEYS } from '../constants/GameConstants';

export const StorageUtil = {
  getHighScore(): number {
    return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) ?? '0', 10) || 0;
  },

  saveHighScore(score: number): void {
    if (score > this.getHighScore()) {
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(score));
    }
  },

  getBestLevel(): number {
    return parseInt(localStorage.getItem(STORAGE_KEYS.BEST_LEVEL) ?? '1', 10) || 1;
  },

  saveBestLevel(level: number): void {
    if (level > this.getBestLevel()) {
      localStorage.setItem(STORAGE_KEYS.BEST_LEVEL, String(level));
    }
  },

  getSaveSlot(): { levelIndex: number; lives: number } | null {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE_SLOT);
    if (!raw) return null;
    try { return JSON.parse(raw) as { levelIndex: number; lives: number }; } catch { return null; }
  },

  saveSaveSlot(levelIndex: number, lives: number): void {
    localStorage.setItem(STORAGE_KEYS.SAVE_SLOT, JSON.stringify({ levelIndex, lives }));
  },

  clearSaveSlot(): void {
    localStorage.removeItem(STORAGE_KEYS.SAVE_SLOT);
  },
};
