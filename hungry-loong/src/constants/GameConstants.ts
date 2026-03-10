// 画布
export const CANVAS_WIDTH  = 480;
export const CANVAS_HEIGHT = 780;

// 网格：22列 × 28行，每格 20px → 游戏区 440×560
export const CELL_SIZE     = 20;
export const GRID_COLS     = 22;
export const GRID_ROWS     = 28;
export const GRID_OFFSET_X = 20;  // 网格左边距
export const GRID_OFFSET_Y = 80;  // 网格上边距（顶部信息栏高度）

// 触控区（移动端手势识别区域起始 Y）
export const TOUCH_ZONE_Y  = 630;

// 字体
export const FONT_FAMILY = '"Ma Shan Zheng", KaiTi, 楷体, STKaiti, "Microsoft YaHei", sans-serif';

// 场景 Key
export const SCENE_KEYS = {
  BOOT:      'BootScene',
  MENU:      'MenuScene',
  GAME:      'GameScene',
  GAME_OVER: 'GameOverScene',
  PAUSE:     'PauseScene',
  SETTINGS:  'SettingsScene',
} as const;

// localStorage Key
export const STORAGE_KEYS = {
  CLASSIC_BEST:  'snake_classic_best',
  ENHANCED_BEST: 'snake_enhanced_best',
} as const;

// 游戏模式
export type GameMode = 'classic' | 'enhanced';

// 颜色
export const COLORS = {
  BG:           0x0a1a0a,   // 画布背景
  GRID_BG:      0x0d1f0d,   // 网格背景
  GRID_LINE:    0x1a3a1a,   // 网格线
  SNAKE_HEAD:   0x44ff44,   // 蛇头
  SNAKE_BODY:   0x22bb22,   // 蛇身
  FOOD_NORMAL:  0xff3333,   // 普通食物
  FOOD_SPEED:   0xffdd00,   // 加速食物
  FOOD_SLOW:    0x4488ff,   // 减速食物
  FOOD_SCORE:   0xffaa00,   // 加分食物
} as const;

// 移动速度（毫秒/格），按分数档位
export const getSnakeInterval = (score: number): number => {
  if (score >= 1000) return 80;
  if (score >= 600)  return 100;
  if (score >= 300)  return 130;
  if (score >= 100)  return 160;
  return 200;
};

// 得分规则
export const SCORE = {
  NORMAL_FOOD:   10,
  SPEED_FOOD:     5,
  SLOW_FOOD:      5,
  SCORE_FOOD:    50,
} as const;

// 增强模式：特殊食物配置
export const ENHANCED = {
  SPECIAL_SPAWN_INTERVAL: 8000,   // 每隔多少ms生成一个特殊食物
  SPECIAL_LIFETIME:      10000,   // 特殊食物自动消失时间(ms)
  BUFF_DURATION:          5000,   // 速度 buff 持续时间(ms)
  MAX_SPECIAL_FOODS:         2,   // 同时最多存在的特殊食物数
} as const;
