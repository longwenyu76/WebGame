import { STORAGE_KEYS, GameMode } from '../constants/GameConstants';

export const StorageUtil = {
  getBest(mode: GameMode): number {
    const key = mode === 'classic' ? STORAGE_KEYS.CLASSIC_BEST : STORAGE_KEYS.ENHANCED_BEST;
    return parseInt(localStorage.getItem(key) ?? '0', 10) || 0;
  },

  saveBest(mode: GameMode, score: number): void {
    const key = mode === 'classic' ? STORAGE_KEYS.CLASSIC_BEST : STORAGE_KEYS.ENHANCED_BEST;
    if (score > this.getBest(mode)) {
      localStorage.setItem(key, String(score));
    }
  },
};
