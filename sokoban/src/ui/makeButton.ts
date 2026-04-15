/**
 * Phaser 版游戏按钮——对应 CSS .game-btn 样式
 *
 * 渐变背景 + 圆角 + 阴影 + hover 上浮 + active 缩小
 */
import Phaser from 'phaser';
import { FONT_FAMILY } from '../constants/GameConstants';

// 对应 CSS 颜色变量
export const BTN_DEFAULT : [number, number] = [0x374151, 0x4b5563];
export const BTN_SUCCESS : [number, number] = [0x22c55e, 0x16a34a];
export const BTN_DANGER  : [number, number] = [0xef4444, 0xdc2626];
export const BTN_SECONDARY:[number, number] = [0x64748b, 0x475569];

export interface BtnOpts {
  w?:        number;
  h?:        number;
  fontSize?: string;
  radius?:   number;
  colors?:   [number, number]; // [top, bottom]
}

/**
 * @param cx  中心 x
 * @param cy  中心 y
 * @returns   Phaser Container（含 shadow / body / label / hit area）
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
    w        = 240,
    h        = 52,
    fontSize = '20px',
    radius   = 12,
    colors   = BTN_DEFAULT,
  } = opts;

  const [topColor, botColor] = colors;
  const baseY = cy;

  // ── 阴影 ──
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.55);
  shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, radius);

  // ── 主体（渐变） ──
  const body = scene.add.graphics();
  body.fillGradientStyle(topColor, topColor, botColor, botColor, 1);
  body.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

  // ── 文字 ──
  const txt = scene.add.text(0, 1, label, {
    fontSize,
    color:      '#ffffff',
    fontStyle:  'bold',
    fontFamily: FONT_FAMILY,
  }).setOrigin(0.5);

  // ── 透明交互区（覆盖整个按钮） ──
  const hit = scene.add.rectangle(0, 0, w, h)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const ctr = scene.add.container(cx, cy, [shadow, body, txt, hit]);

  // ── 动效 ──
  hit.on('pointerover', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY - 2, duration: 120, ease: 'Quad.easeOut' });
  });
  hit.on('pointerout', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({
      targets: ctr, y: baseY, scaleX: 1, scaleY: 1,
      duration: 120, ease: 'Quad.easeOut',
    });
  });
  hit.on('pointerdown', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({
      targets: ctr, scaleX: 0.97, scaleY: 0.97, y: baseY,
      duration: 60, ease: 'Quad.easeOut',
    });
  });
  hit.on('pointerup', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.easeOut' });
    onClick();
  });

  return ctr;
}
