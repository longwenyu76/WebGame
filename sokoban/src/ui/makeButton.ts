/**
 * Phaser 版双层渐变按钮，对应：
 *
 *   <button class="p-[4px] rounded-[12px] bg-gradient-to-b from-gray-700 to-gray-600 shadow-...">
 *     <div class="bg-gradient-to-b from-gray-600 to-gray-700 rounded-[8px] px-3 py-2">
 *       <span>Label</span>
 *     </div>
 *   </button>
 *
 * 外层 (dark→light) 的 4px 内边距露出来，形成视觉"边框"。
 * 内层 (light→dark) 是实际按钮面。
 */
import Phaser from 'phaser';
import { FONT_FAMILY } from '../constants/GameConstants';

// 每个颜色对 = [dark, light]（外层 top=dark→bot=light，内层 top=light→bot=dark）
export const BTN_DEFAULT  : [number, number] = [0x374151, 0x4b5563]; // gray-700 / gray-600
export const BTN_SUCCESS  : [number, number] = [0x16a34a, 0x22c55e]; // green-600 / green-500
export const BTN_DANGER   : [number, number] = [0xdc2626, 0xef4444]; // red-600 / red-500
export const BTN_SECONDARY: [number, number] = [0x475569, 0x64748b]; // slate-600 / slate-500
export const BTN_PRIMARY  : [number, number] = [0x1d4ed8, 0x2563eb]; // blue-700 / blue-600

export interface BtnOpts {
  w?:        number;   // 总宽（含 4px 边距），默认 240
  h?:        number;   // 总高，默认 52
  fontSize?: string;
  colors?:   [number, number]; // [dark, light]
}

/**
 * @param cx  容器中心 x（场景坐标）
 * @param cy  容器中心 y（场景坐标）
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
    colors   = BTN_DEFAULT,
  } = opts;
  const [dark, light] = colors;

  // ── 阴影 shadow-[0_2px_4px_rgba(0,0,0,0.7)] ───────────────────────────────
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.55);
  shadow.fillRoundedRect(-w / 2 + 1, -h / 2 + 3, w - 2, h, 12);

  // ── 外层 from-gray-700(dark) to-gray-600(light)，圆角 12px ─────────────────
  const outer = scene.add.graphics();
  outer.fillGradientStyle(dark, dark, light, light, 1);
  outer.fillRoundedRect(-w / 2, -h / 2, w, h, 12);

  // ── 内层 from-gray-600(light) to-gray-700(dark)，圆角 8px，内缩 4px ────────
  const inner = scene.add.graphics();
  inner.fillGradientStyle(light, light, dark, dark, 1);
  inner.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 8);

  // ── 文字 ──────────────────────────────────────────────────────────────────
  const txt = scene.add.text(0, 1, label, {
    fontSize,
    color:      '#ffffff',
    fontStyle:  'bold',
    fontFamily: FONT_FAMILY,
  }).setOrigin(0.5);

  // ── 透明交互区 ────────────────────────────────────────────────────────────
  const hit = scene.add.rectangle(0, 0, w, h)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const ctr = scene.add.container(cx, cy, [shadow, outer, inner, txt, hit]);
  const baseY = cy;

  // ── 动效 ──────────────────────────────────────────────────────────────────
  hit.on('pointerover', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY - 2, duration: 120, ease: 'Quad.easeOut' });
  });
  hit.on('pointerout', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY, scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
  });
  hit.on('pointerdown', () => {
    scene.tweens.killTweensOf(ctr);
    // active: scale-[0.995] + shadow 缩小
    scene.tweens.add({ targets: ctr, scaleX: 0.995, scaleY: 0.995, y: baseY, duration: 60, ease: 'Quad.easeOut' });
  });
  hit.on('pointerup', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
    onClick();
  });

  return ctr;
}
