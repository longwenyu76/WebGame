/**
 * Phaser 三层渐变按钮（移植自推箱工人，适配 2048 暖色调）
 */
import Phaser from 'phaser';
import { FONT_FAMILY } from '../constants/GameConstants';

export type BtnColorSet = [number, number, number, number, number];
// [outerColor(unused), frameDark, frameLight, panelLight, panelDark]

// 2048 暖棕色系
export const BTN_DEFAULT : BtnColorSet = [0xfaf8ef, 0x6b5a4e, 0x8f7a66, 0x8f7a66, 0x6b5a4e];
export const BTN_DANGER  : BtnColorSet = [0xfaf8ef, 0xb84a2a, 0xf65e3b, 0xf65e3b, 0xb84a2a];
export const BTN_SUCCESS : BtnColorSet = [0xfaf8ef, 0x4a7c59, 0x6aab7a, 0x6aab7a, 0x4a7c59];
export const BTN_DARK    : BtnColorSet = [0xfaf8ef, 0x4a4037, 0x776e65, 0x776e65, 0x4a4037];

export interface BtnOpts {
  w?:             number;
  h?:             number;
  fontSize?:      string;
  radius?:        number;
  colors?:        BtnColorSet | [number, number];
  triggerOnDown?: boolean;
}

function normalizeColors(c: BtnColorSet | [number, number]): BtnColorSet {
  if (c.length === 5) return c as BtnColorSet;
  const [a, b] = c as [number, number];
  return [0xfaf8ef, a, b, b, a];
}

export function makeButton(
  scene:   Phaser.Scene,
  cx:      number,
  cy:      number,
  label:   string,
  onClick: () => void,
  opts:    BtnOpts = {},
): Phaser.GameObjects.Container {
  const {
    w             = 150,
    h             = 50,
    fontSize      = '20px',
    radius        = 14,
    triggerOnDown = false,
  } = opts;

  const [, frameDark, frameLight, panelLight, panelDark] =
    normalizeColors(opts.colors ?? BTN_DEFAULT);

  const baseY = cy;
  const hw = w / 2;
  const hh = h / 2;
  const pad = 4;

  const g = scene.add.graphics();

  // ── 框架层 ──
  const fW = w, fH = h, fR = radius;
  g.fillStyle(frameDark, 1);
  g.fillRoundedRect(-hw, -hh, fW, fH, fR);

  // ── 面板层 ──
  const pW = fW - pad * 2;
  const pH = fH - pad * 2;
  const pR = Math.max(2, fR - pad);
  g.fillStyle(panelLight, 1);
  g.fillRoundedRect(-hw + pad, -hh + pad, pW, pH, pR);

  // ── 文字 ──
  const txt = scene.add.text(0, 1, label, {
    fontSize,
    color:      '#f9f6f2',
    fontStyle:  'bold',
    fontFamily: FONT_FAMILY,
  }).setOrigin(0.5);

  // ── 透明交互区 ──
  const hit = scene.add.rectangle(0, 0, w, h)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const ctr = scene.add.container(cx, cy, [g, txt, hit]);

  hit.on('pointerover', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY - 2, duration: 150, ease: 'Quad.easeOut' });
  });
  hit.on('pointerout', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY, scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
  });
  hit.on('pointerdown', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, scaleX: 0.97, scaleY: 0.97, y: baseY + 1, duration: 60, ease: 'Quad.easeOut' });
    if (triggerOnDown) onClick();
  });
  hit.on('pointerup', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, scaleX: 1, scaleY: 1, y: baseY, duration: 150, ease: 'Back.easeOut' });
    if (!triggerOnDown) onClick();
  });

  return ctr;
}
