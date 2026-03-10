// 网格尺寸
export const GRID_COLS = 10;
export const GRID_ROWS = 20;
export const CELL_SIZE = 28; // 每格像素大小

// 画布布局
export const CANVAS_WIDTH  = 480;
export const CANVAS_HEIGHT = 780;   // 640 游戏区 + 140 触控按钮区
export const TOUCH_ZONE_Y  = 632;   // 按钮区起始 Y（游戏网格底部 y=620 + 12px 间距）
export const GRID_OFFSET_X = 16; // 网格左边距
export const GRID_OFFSET_Y = 60; // 网格上边距
export const INFO_PANEL_X = GRID_OFFSET_X + GRID_COLS * CELL_SIZE + 16; // 信息面板X起点

// 颜色（Phaser 0xRRGGBB 格式）
export const COLORS: Record<string, number> = {
  I: 0x00f0f0, // 青色
  O: 0xf0f000, // 黄色
  T: 0xa000f0, // 紫色
  S: 0x00f000, // 绿色
  Z: 0xf00000, // 红色
  J: 0x0000f0, // 蓝色
  L: 0xf0a000, // 橙色
  GHOST: 0x444466, // 投影色
  GRID_BG: 0x0d0d1a, // 网格背景
  GRID_LINE: 0x222244, // 网格线
};

// 计分规则
export const SCORE_TABLE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

// 等级提升（每N行升一级）
export const LINES_PER_LEVEL = 10;

// 下落速度（毫秒/格），等级1起始，每级递减90ms，最低100ms
export const getDropInterval = (level: number): number => {
  return Math.max(100, 1000 - (level - 1) * 90);
};

// 键盘 DAS/ARR 配置（毫秒）
export const DAS_DELAY = 150; // 首次长按延迟
export const ARR_INTERVAL = 50; // 连续触发间隔

// 场景 Key
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  GAME_OVER: 'GameOverScene',
  PAUSE: 'PauseScene',
  SETTINGS: 'SettingsScene',
} as const;

// 音频 Key
export const AUDIO_KEYS = {
  BGM: 'bgm',
  MOVE: 'move',
  ROTATE: 'rotate',
  CLEAR: 'clear',
  GAME_OVER: 'gameover',
} as const;

// 字体（楷体风格，兼容跨平台）
export const FONT_FAMILY = '"Ma Shan Zheng", KaiTi, 楷体, STKaiti, "Microsoft YaHei", sans-serif';

// localStorage Key
export const STORAGE_KEYS = {
  HIGH_SCORE: 'tetris_high_score',
} as const;
