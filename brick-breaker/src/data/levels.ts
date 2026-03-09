import { BrickType, PowerupType } from '../constants/GameConstants';

export interface CellData {
  type:     BrickType;
  powerup?: PowerupType; // 仅当 type === 'powerup' 时有效
}

export interface LevelData {
  id:   number;
  name: string;
  grid: CellData[][];  // [row][col]，每行 10 列，最多 12 行
}

// 快捷构造函数
const E = (): CellData => ({ type: 'empty' });
const N = (): CellData => ({ type: 'normal' });
const R = (): CellData => ({ type: 'reinforced' });
const S = (): CellData => ({ type: 'solid' });
const I = (): CellData => ({ type: 'iron' });
const P = (powerup: PowerupType): CellData => ({ type: 'powerup', powerup });

export const LEVELS: LevelData[] = [
  // ── 第 1 关：热身 ─────────────────────────────────────────────────────────
  {
    id: 1, name: '热身',
    grid: [
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
      [N(), N(), P('wide_paddle'), N(), N(), N(), N(), P('slow_ball'), N(), N()],
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
    ],
  },

  // ── 第 2 关：加固 ─────────────────────────────────────────────────────────
  {
    id: 2, name: '加固',
    grid: [
      [R(), R(), R(), R(), R(), R(), R(), R(), R(), R()],
      [R(), N(), N(), N(), N(), N(), N(), N(), N(), R()],
      [R(), N(), P('multi_ball'), N(), N(), N(), N(), P('extra_life'), N(), R()],
      [R(), N(), N(), N(), N(), N(), N(), N(), N(), R()],
      [R(), R(), R(), R(), R(), R(), R(), R(), R(), R()],
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
    ],
  },

  // ── 第 3 关：铁墙 ─────────────────────────────────────────────────────────
  {
    id: 3, name: '铁墙',
    grid: [
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
      [N(), I(), N(), I(), N(), N(), I(), N(), I(), N()],
      [N(), N(), N(), N(), P('fire_ball'), P('fast_ball'), N(), N(), N(), N()],
      [N(), I(), N(), I(), N(), N(), I(), N(), I(), N()],
      [R(), R(), R(), R(), R(), R(), R(), R(), R(), R()],
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
    ],
  },

  // ── 第 4 关：坚固堡垒 ─────────────────────────────────────────────────────
  {
    id: 4, name: '堡垒',
    grid: [
      [S(), S(), S(), S(), S(), S(), S(), S(), S(), S()],
      [S(), I(), I(), I(), I(), I(), I(), I(), I(), S()],
      [S(), I(), R(), R(), P('multi_ball'), P('extra_life'), R(), R(), I(), S()],
      [S(), I(), R(), N(), N(), N(), N(), R(), I(), S()],
      [S(), I(), I(), I(), I(), I(), I(), I(), I(), S()],
      [S(), S(), S(), S(), S(), S(), S(), S(), S(), S()],
    ],
  },

  // ── 第 5 关：混沌 ─────────────────────────────────────────────────────────
  {
    id: 5, name: '混沌',
    grid: [
      [S(), R(), N(), I(), S(), S(), I(), N(), R(), S()],
      [R(), S(), R(), N(), R(), R(), N(), R(), S(), R()],
      [N(), R(), S(), R(), N(), N(), R(), S(), R(), N()],
      [I(), N(), R(), S(), P('fire_ball'), P('wide_paddle'), S(), R(), N(), I()],
      [N(), R(), S(), R(), N(), N(), R(), S(), R(), N()],
      [R(), S(), R(), N(), R(), R(), N(), R(), S(), R()],
      [S(), R(), N(), I(), P('multi_ball'), P('extra_life'), I(), N(), R(), S()],
      [N(), N(), N(), N(), N(), N(), N(), N(), N(), N()],
    ],
  },
];
