// ── 画布 ────────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH  = 480;
export const CANVAS_HEIGHT = 780;

// ── 字体 ────────────────────────────────────────────────────────────────────
export const FONT_FAMILY = '"Ma Shan Zheng", KaiTi, 楷体, STKaiti, "Microsoft YaHei", sans-serif';

// ── 砖块网格 ─────────────────────────────────────────────────────────────────
export const BRICK_COLS    = 10;
export const BRICK_ROWS    = 12;      // 最大行数（关卡可用 1–12 行）
export const BRICK_W       = 44;      // 砖块宽度（px）
export const BRICK_H       = 18;      // 砖块高度（px）
export const BRICK_GAP_X   = 2;       // 横向间距
export const BRICK_GAP_Y   = 4;       // 纵向间距
// 砖块区左边距：使砖块组整体水平居中
export const BRICK_AREA_X  = Math.round(
  (CANVAS_WIDTH - BRICK_COLS * BRICK_W - (BRICK_COLS - 1) * BRICK_GAP_X) / 2
); // = 11
export const BRICK_AREA_Y  = 60;      // 砖块区顶部 Y

// ── 挡板 ────────────────────────────────────────────────────────────────────
export const PADDLE_W_NORMAL = 80;    // 正常宽度
export const PADDLE_H        = 12;    // 高度
export const PADDLE_Y        = 710;   // 挡板中心 Y
// 宽/窄挡板叠加上下限（相对正常宽度的倍率）
export const PADDLE_SCALE_MAX = 4;    // 最大 4× = 320px
export const PADDLE_SCALE_MIN = 0.25; // 最小 0.25× = 20px

// ── 球 ──────────────────────────────────────────────────────────────────────
export const BALL_RADIUS         = 5;
export const BALL_SPEED_BASE     = 300;  // px/s（第一关）
export const BALL_SPEED_PER_LEVEL = 20;  // 每关速度增量 px/s
export const BALL_SPEED_MAX      = 600;  // px/s 上限
export const BALL_MAX_COUNT      = 64;   // 多球最多 64 个

// ── 道具 ────────────────────────────────────────────────────────────────────
export const POWERUP_FALL_SPEED = 120; // 道具下落速度 px/s
export const POWERUP_W          = 32;
export const POWERUP_H          = 16;

// ── 命 ──────────────────────────────────────────────────────────────────────
export const INITIAL_LIVES = 3;

// ── 场景 Key ─────────────────────────────────────────────────────────────────
export const SCENE_KEYS = {
  BOOT:        'BootScene',
  MENU:        'MenuScene',
  GAME:        'GameScene',
  LEVEL_CLEAR: 'LevelClearScene',
  GAME_CLEAR:  'GameClearScene',
  GAME_OVER:   'GameOverScene',
  PAUSE:       'PauseScene',
} as const;

// ── localStorage Key ─────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  HIGH_SCORE:  'breakout_high_score',
  BEST_LEVEL:  'breakout_best_level',
  SAVE_SLOT:   'breakout_save',
} as const;

// ── 计分 ────────────────────────────────────────────────────────────────────
export const SCORE = {
  NORMAL:           10,
  REINFORCED:       20,
  SOLID:            30,
  LEVEL_CLEAR_BASE: 200,  // × 关卡编号
  LIFE_BONUS:       100,  // 通关后每条剩余命
} as const;

// ── 砖块颜色 ──────────────────────────────────────────────────────────────────
// 普通砖块按行着色（共 12 色循环）
export const NORMAL_BRICK_COLORS = [
  0xff3333, // 0 红
  0xff6600, // 1 橙红
  0xff9900, // 2 橙
  0xffcc00, // 3 黄
  0x99cc00, // 4 黄绿
  0x33cc33, // 5 绿
  0x00ccaa, // 6 青绿
  0x33aaff, // 7 蓝
  0x6633ff, // 8 紫
  0xcc33cc, // 9 品红
  0xff3399, // 10 玫红
  0xff6699, // 11 粉
] as const;

export const REINFORCED_BRICK_COLOR  = 0x8866aa; // 紫（受击后变浅）
export const SOLID_BRICK_COLOR       = 0x336688; // 深蓝（受击逐步变色）
export const IRON_BRICK_COLOR        = 0x778899; // 铁灰
export const POWERUP_BRICK_COLOR     = 0x222244; // 深底色（外框闪烁）

// ── 道具颜色 ──────────────────────────────────────────────────────────────────
export const POWERUP_COLORS: Record<string, number> = {
  wide_paddle:   0x44ff44, // 绿
  narrow_paddle: 0xff3333, // 红
  fast_ball:     0xff8800, // 橙
  slow_ball:     0x4488ff, // 蓝
  multi_ball:    0xffdd00, // 金
  fire_ball:     0xff4400, // 红橙
  extra_life:    0xff66aa, // 粉
};

// ── 道具标签 ──────────────────────────────────────────────────────────────────
export const POWERUP_LABELS: Record<string, string> = {
  wide_paddle:   '宽板',
  narrow_paddle: '窄板',
  fast_ball:     '快球',
  slow_ball:     '慢球',
  multi_ball:    '多球',
  fire_ball:     '火球',
  extra_life:    '+命',
};

// ── 类型定义 ──────────────────────────────────────────────────────────────────
export type BrickType   = 'empty' | 'normal' | 'reinforced' | 'solid' | 'iron' | 'powerup';
export type PowerupType =
  | 'wide_paddle' | 'narrow_paddle'
  | 'fast_ball'   | 'slow_ball'
  | 'multi_ball'  | 'fire_ball'
  | 'extra_life';
