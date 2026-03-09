import { STORAGE_KEYS } from '../constants/GameConstants';

export const StorageUtil = {
  getHighScore(): number {
    const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
    return val ? parseInt(val, 10) : 0;
  },

  saveHighScore(score: number): void {
    const current = this.getHighScore();
    if (score > current) {
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(score));
    }
  },
};
