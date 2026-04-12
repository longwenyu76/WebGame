import { LEVELS, OPTIMAL_MOVES } from './levels';
import { LEVELS_ORIGINAL, OPTIMAL_MOVES_ORIGINAL } from './levels_original';

export interface LevelSet {
  id: string;
  authorCN: string;
  authorEN: string;
  levels: string[][];
  optimalMoves: number[];
}

export const LEVEL_SETS: LevelSet[] = [
  {
    id: 'alberto',
    authorCN: 'Alberto García',
    authorEN: 'Alberto García',
    levels: LEVELS,
    optimalMoves: OPTIMAL_MOVES,
  },
  {
    id: 'original',
    authorCN: '今林宏行',
    authorEN: 'Hiroyuki Imabayashi',
    levels: LEVELS_ORIGINAL,
    optimalMoves: OPTIMAL_MOVES_ORIGINAL,
  },
];
