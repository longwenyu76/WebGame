// ── 画布 ─────────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH  = 480;
export const CANVAS_HEIGHT = 780;

// ── 字体 ─────────────────────────────────────────────────────────────────────
// 用于汉字标题、按钮等 UI 文字
export const FONT_FAMILY = '"Ma Shan Zheng", KaiTi, 楷体, STKaiti, "Microsoft YaHei", sans-serif';
// 用于方块内的数字——清晰粗体无衬线，与标题里 "2048" 数字风格一致
export const TILE_FONT_FAMILY = '"Clear Sans", "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif';

// ── 棋盘布局 ──────────────────────────────────────────────────────────────────
export const GRID_SIZE  = 4;     // 4×4
export const TILE_SIZE  = 97;    // 每格像素大小
export const TILE_GAP   = 12;    // 格间距（含外边框）
export const GRID_X     = 16;    // 棋盘左边界 X
export const GRID_Y     = 121;   // 棋盘顶边界 Y
// 棋盘总宽/高 = GAP + (TILE_SIZE + GAP) * 4 = 12 + 109*4 = 448
export const BOARD_SIZE = TILE_GAP + (TILE_SIZE + TILE_GAP) * GRID_SIZE; // 448

// ── 动画时长(ms) ─────────────────────────────────────────────────────────────
export const ANIM_MOVE_MS  = 150;
export const ANIM_SPAWN_MS = 120;
export const ANIM_MERGE_MS = 100;

// ── 场景 Key ─────────────────────────────────────────────────────────────────
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  GAME: 'GameScene',
} as const;

// ── localStorage Key ─────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  HIGH_SCORE:   'g2048_high',
  CURRENT_GAME: 'g2048_current',
} as const;

// ── 方块颜色 (0xRRGGBB) ───────────────────────────────────────────────────────
export const TILE_BG_COLORS: Record<number, number> = {
  0:    0xcdc1b4,
  2:    0xeee4da,
  4:    0xede0c8,
  8:    0xf2b179,
  16:   0xf59563,
  32:   0xf67c5f,
  64:   0xf65e3b,
  128:  0xedcf72,
  256:  0xedcc61,
  512:  0xedc850,
  1024: 0xedc53f,
  2048: 0xedc22e,
};
// 超过 2048 的方块用深色
export const TILE_BG_OVER  = 0x3c3a32;
export const TILE_BG_EMPTY = 0xcdc1b4;

// 数字颜色
export const TILE_TEXT_DARK  = '#776e65';  // 2, 4
export const TILE_TEXT_LIGHT = '#f9f6f2';  // 8+

// 背景色
export const BOARD_BG_COLOR = 0xbbada0;
export const CANVAS_BG      = 0xfaf8ef;
