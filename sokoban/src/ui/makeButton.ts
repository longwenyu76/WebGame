/**
 * Phaser 版游戏按钮 —— 精确还原 uiverse.io mahiatlinux/cowardly-crab-22
 *
 * 原始 CSS 结构（三层嵌套，每层 4px padding 充当"边框"）：
 *
 *   ┌─ 外层 ─────────────────────────────────────────┐  gray-800/40→transparent  r=16
 *   │ ┌─ 框架 ─────────────────────────────────────┐ │  gray-700→gray-600       r=12
 *   │ │ ┌─ 面板 ─────────────────────────────────┐ │ │  gray-600→gray-700       r=8
 *   │ │ │           Get Started                  │ │ │
 *   │ │ └────────────────────────────────────────┘ │ │
 *   │ └────────────────────────────────────────────┘ │
 *   └────────────────────────────────────────────────┘
 *
 * 框架渐变 暗→亮（上→下），面板渐变 亮→暗（上→下）——方向相反，产生立体感。
 */
import Phaser from 'phaser';
import { FONT_FAMILY } from '../constants/GameConstants';

// ── Tailwind gray 色值 ──────────────────────────────────────────────────────────
const GRAY_600 = 0x4b5563;
const GRAY_700 = 0x374151;
const GRAY_800 = 0x1f2937;

// ── 颜色预设：[外层, 框架暗, 框架亮, 面板亮, 面板暗] ────────────────────────────
//  框架：上（暗）→下（亮）  面板：上（亮）→下（暗）  方向相反！
export type BtnColorSet = [number, number, number, number, number];

export const BTN_DEFAULT  : BtnColorSet = [0x1a1a2e, GRAY_700, GRAY_600, GRAY_600, GRAY_700];
export const BTN_SUCCESS  : BtnColorSet = [0x14532d, 0x166534, 0x22c55e, 0x22c55e, 0x166534];
export const BTN_DANGER   : BtnColorSet = [0x7f1d1d, 0x991b1b, 0xef4444, 0xef4444, 0x991b1b];
export const BTN_SECONDARY: BtnColorSet = [0x1e293b, 0x334155, 0x64748b, 0x64748b, 0x334155];

export interface BtnOpts {
  w?:             number;
  h?:             number;
  fontSize?:      string;
  radius?:        number;
  colors?:        BtnColorSet | [number, number];   // 兼容旧版 2 色写法
  triggerOnDown?: boolean;                          // true = pointerdown 时立即触发（用于方向键）
}

// 旧版 2 色 → 5 色自动派生
function normalizeColors(c: BtnColorSet | [number, number]): BtnColorSet {
  if (c.length === 5) return c as BtnColorSet;
  const [a, b] = c;
  return [darken(a, 0.3), a, b, b, a];
}

function darken(color: number, amount: number): number {
  const r = Math.max(0, Math.floor(((color >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((color >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((color & 0xff) * (1 - amount)));
  return (r << 16) | (g << 8) | b;
}

/**
 * @param cx  中心 x
 * @param cy  中心 y
 * @returns   Phaser Container
 */
export function makeButton(
  scene:   Phaser.Scene,
  cx:      number,
  cy:      number,
  label:   string,
  onClick: () => void,
  opts:    BtnOpts = {},
): Phaser.GameObjects.Container {
  const {
    w             = 240,
    h             = 52,
    fontSize      = '20px',
    radius        = 16,
    triggerOnDown = false,
  } = opts;

  const [outerColor, frameDark, frameLight, panelLight, panelDark] =
    normalizeColors(opts.colors ?? BTN_DEFAULT);

  const baseY = cy;
  const hw    = w / 2;
  const hh    = h / 2;
  const pad   = 4;          // 每层 padding，与 CSS 的 p-[4px] 一致

  const g = scene.add.graphics();

  // ── ③ 框架层：gray-700(上) → gray-600(下) ──
  const fW = w - pad * 2;
  const fH = h - pad * 2;
  const fR = radius - pad;   // 12px
  //g.fillGradientStyle(frameDark, frameDark, frameLight, frameLight, 1);
  g.fillStyle(frameDark, 1);
  g.fillRoundedRect(-hw + pad, -hh + pad, fW, fH, fR);


  // ── ④ 面板层：gray-600(上) → gray-700(下) —— 方向相反！──
  const pW = fW - pad * 2;
  const pH = fH - pad * 2;
  const pR = fR - pad;       // 8px
  //g.fillGradientStyle(panelLight, panelLight, panelDark, panelDark, 1);
  g.fillStyle(panelLight, 1);
  g.fillRoundedRect(-hw + pad * 2, -hh + pad * 2, pW, pH, pR);

  // ── 文字 ──
  const txt = scene.add.text(0, 1, label, {
    fontSize,
    color:      '#ffffff',
    fontStyle:  'bold',
    fontFamily: FONT_FAMILY,
  }).setOrigin(0.5);

  // ── 透明交互区 ──
  const hit = scene.add.rectangle(0, 0, w, h)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const ctr = scene.add.container(cx, cy, [g, txt, hit]);

  // ── 动效（还原 CSS hover / active）──
  // hover:  shadow 变大（用 y 偏移模拟"上浮"）
  // active: scale(0.995)（缩小 + 阴影缩小模拟"按下"）
  hit.on('pointerover', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY - 2, duration: 150, ease: 'Quad.easeOut' });
  });
  hit.on('pointerout', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({
      targets: ctr, y: baseY, scaleX: 1, scaleY: 1,
      duration: 150, ease: 'Quad.easeOut',
    });
  });
  hit.on('pointerdown', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({
      targets: ctr, scaleX: 0.995, scaleY: 0.995, y: baseY + 1,
      duration: 60, ease: 'Quad.easeOut',
    });
    if (triggerOnDown) onClick();
  });
  hit.on('pointerup', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({
      targets: ctr, scaleX: 1, scaleY: 1, y: baseY,
      duration: 150, ease: 'Back.easeOut',
    });
    if (!triggerOnDown) onClick();
  });

  return ctr;
}