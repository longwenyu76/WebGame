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
};
