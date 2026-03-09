import { SCORE_TABLE, LINES_PER_LEVEL, getDropInterval } from '../constants/GameConstants';

export class ScoreManager {
  private score: number = 0;
  private level: number = 1;
  private linesCleared: number = 0;

  getScore(): number { return this.score; }
  getLevel(): number { return this.level; }
  getLinesCleared(): number { return this.linesCleared; }
  getDropInterval(): number { return getDropInterval(this.level); }

  reset(): void {
    this.score = 0;
    this.level = 1;
    this.linesCleared = 0;
  }

  /**
   * 消除 N 行后调用，更新分数、行数、等级
   * @returns 是否升级了
   */
  addLines(lines: number): boolean {
    if (lines <= 0) return false;

    const points = SCORE_TABLE[lines] ?? 0;
    this.score += points;
    this.linesCleared += lines;

    const newLevel = Math.floor(this.linesCleared / LINES_PER_LEVEL) + 1;
    const leveledUp = newLevel > this.level;
    this.level = newLevel;

    return leveledUp;
  }
}
