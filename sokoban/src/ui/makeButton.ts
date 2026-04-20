/**
 * Phaser 三层渐变按钮，完整还原：
 *
 *   <div class="bg-gradient-to-b from-gray-800/40 to-transparent p-[4px] rounded-[16px]">
 *     <button class="p-[4px] rounded-[12px] bg-gradient-to-b from-gray-700 to-gray-600
 *                    shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
 *       <div class="bg-gradient-to-b from-gray-600 to-gray-700 rounded-[8px]">
 *         <span>Label</span>
 *       </div>
 *     </button>
 *   </div>
 *
 * Layer 1 (wrapper): gray-800/40(top) → transparent(bot)，radius 16，渐变淡出 rim
 * Layer 2 (button) : dark(top) → light(bot)，radius 12，露出 4px 作"边框"
 * Layer 3 (inner)  : light(top) → dark(bot)（反向），radius 8，按钮主面
 * Layer 4 (highlight): inset 顶部白色细线，模拟 inset_0_1px_0_rgba(255,255,255,0.1)
 */
import Phaser from 'phaser';
import { FONT_FAMILY } from '../constants/GameConstants';

// 每个颜色对 = [dark, light]
// button outer: top=dark → bot=light
// inner div:    top=light → bot=dark（反向）
export const BTN_DEFAULT  : [number, number] = [0x374151, 0x4b5563]; // gray-700 / gray-600
export const BTN_SUCCESS  : [number, number] = [0x16a34a, 0x22c55e]; // green-600 / green-500
export const BTN_DANGER   : [number, number] = [0xdc2626, 0xef4444]; // red-600 / red-500
export const BTN_SECONDARY: [number, number] = [0x475569, 0x64748b]; // slate-600 / slate-500
export const BTN_PRIMARY  : [number, number] = [0x1d4ed8, 0x2563eb]; // blue-700 / blue-600

export interface BtnOpts {
  w?:        number;
  h?:        number;
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
  const baseY = cy;

  // ── Layer 0: 阴影 ──────────────────────────────────────────────────────────
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.65);
  shadow.fillRoundedRect(-(w + 8) / 2 + 1, -(h + 8) / 2 + 4, w + 6, h + 6, 16);

  // ── Layer 1: wrapper  from-gray-800/40(top) → transparent(bot) ────────────
  // 用 fillGradientStyle 的逐顶点 alpha：上两角 0.40，下两角 0
  const wrapper = scene.add.graphics();
  (wrapper.fillGradientStyle as (...args: unknown[]) => void)(
    0x1f2937, 0x1f2937, 0x1f2937, 0x1f2937,
    0.40, 0.40, 0, 0,
  );
  wrapper.fillRoundedRect(-(w + 8) / 2, -(h + 8) / 2, w + 8, h + 8, 16);

  // ── Layer 2: button outer  dark(top) → light(bot) ─────────────────────────
  const outer = scene.add.graphics();
  outer.fillGradientStyle(dark, dark, light, light, 1);
  outer.fillRoundedRect(-w / 2, -h / 2, w, h, 12);

  // ── Layer 3: inner div  light(top) → dark(bot)（反向）─────────────────────
  const inner = scene.add.graphics();
  inner.fillGradientStyle(light, light, dark, dark, 1);
  inner.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 8);

  // ── Layer 4: inset 顶部高光  inset 0 1px 0 rgba(255,255,255,0.10) ──────────
  const hl = scene.add.graphics();
  hl.fillStyle(0xffffff, 0.10);
  hl.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, 3, { tl: 8, tr: 8, bl: 0, br: 0 });

  // ── 文字 ──────────────────────────────────────────────────────────────────
  const txt = scene.add.text(0, 1, label, {
    fontSize,
    color:      '#ffffff',
    fontStyle:  'bold',
    fontFamily: FONT_FAMILY,
  }).setOrigin(0.5);

  // ── 透明交互区 ────────────────────────────────────────────────────────────
  const hit = scene.add.rectangle(0, 0, w + 8, h + 8)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  const ctr = scene.add.container(cx, cy, [shadow, wrapper, outer, inner, hl, txt, hit]);

  // ── 动效 ──────────────────────────────────────────────────────────────────
  hit.on('pointerover', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY - 2, duration: 120, ease: 'Quad.easeOut' });
    shadow.setAlpha(0.5);
  });
  hit.on('pointerout', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, y: baseY, scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
    shadow.setAlpha(1);
  });
  hit.on('pointerdown', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, scaleX: 0.995, scaleY: 0.995, y: baseY, duration: 60, ease: 'Quad.easeOut' });
    shadow.setAlpha(0.2);
  });
  hit.on('pointerup', () => {
    scene.tweens.killTweensOf(ctr);
    scene.tweens.add({ targets: ctr, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
    shadow.setAlpha(1);
    onClick();
  });

  return ctr;
}
