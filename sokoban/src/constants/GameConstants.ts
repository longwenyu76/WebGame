export const CANVAS_WIDTH  = 480;
export const CANVAS_HEIGHT = 800;

export const FONT_FAMILY = "'Sansation', 'Ma Shan Zheng', 'Microsoft YaHei', sans-serif";

// 颜色
export const COLOR_BG         = 0x1a1a2e;
export const COLOR_BOARD_BG   = 0x2c3e50;
export const COLOR_WALL       = 0x4a5568;
export const COLOR_WALL_LIGHT = 0x718096;
export const COLOR_FLOOR      = 0x2d3748;
export const COLOR_TARGET     = 0x27ae60;
export const COLOR_TARGET_DOT = 0x2ecc71;
export const COLOR_BOX        = 0xe67e22;
export const COLOR_BOX_DARK   = 0xd35400;
export const COLOR_BOX_ON_TGT = 0x27ae60;
export const COLOR_BOX_ON_DARK= 0x1e8449;
export const COLOR_PLAYER     = 0x3498db;
export const COLOR_PLAYER_DARK= 0x2980b9;
export const COLOR_HUD_BG     = 0x0d0d2a;
export const COLOR_BTN        = 0x4a5568;
export const COLOR_BTN_HOVER  = 0x718096;
export const COLOR_BTN_UNDO   = 0x2980b9;
export const COLOR_BTN_RESET  = 0xe74c3c;

// 动画
export const ANIM_MOVE_MS  = 80;   // 移动动画时长
export const ANIM_WIN_MS   = 400;  // 胜利动画时长

// 瓦片尺寸限制
export const TILE_MIN = 28;
export const TILE_MAX = 60;

// 游戏区域
export const HUD_HEIGHT      = 112;  // 顶部 HUD 高度（含按钮行）
export const CTRL_HEIGHT     = 162;  // 底部控制区高度（仅方向键）
export const GAME_AREA_TOP   = HUD_HEIGHT;
export const GAME_AREA_H     = CANVAS_HEIGHT - HUD_HEIGHT - CTRL_HEIGHT;  // 526

export const SCENE_KEYS = {
  BOOT:     'Boot',
  MENU:     'Menu',
  SELECT:   'Select',
  GAME:     'Game',
  SETTINGS: 'Settings',
  HELP:     'Help',
} as const;
