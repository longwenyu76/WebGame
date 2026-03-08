import Phaser from 'phaser';
import { FONT_FAMILY } from '../constants/GameConstants';

type ActionCallback = () => void;

const REPEAT_DELAY    = 150; // 长按触发 DAS 前的等待时间（ms）
const REPEAT_INTERVAL = 50;  // ARR 触发间隔（ms）

interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel: string;
  bgColor: number;
  alpha: number;
  repeatable: boolean;
  callback: ActionCallback;
}

// 布局常量（左右等宽，贴两侧边缘，间距 10px）
const BTN_W   = 72;
const LEFT_X  = 0;
const RIGHT_X = 480 - BTN_W;   // = 408
const BTN_H   = 62;
const BTN_GAP = 10;
const BTN_Y   = [
  640 - BTN_H * 3 - BTN_GAP * 2 - 8,                  // = 426
  640 - BTN_H * 3 - BTN_GAP * 2 - 8 + BTN_H + BTN_GAP, // = 498
  640 - BTN_H * 3 - BTN_GAP * 2 - 8 + (BTN_H + BTN_GAP) * 2, // = 570
];

export class TouchControls {
  private container: Phaser.GameObjects.Container;

  // 长按计时器：存 { delay剩余, interval计时, callback }
  private repeatTimers: Map<
    Phaser.GameObjects.Container,
    { delay: number; interval: number; callback: ActionCallback }
  > = new Map();

  constructor(
    scene: Phaser.Scene,
    callbacks: {
      onMoveLeft:  ActionCallback;
      onMoveRight: ActionCallback;
      onSoftDrop:  ActionCallback;
      onHardDrop:  ActionCallback;
      onRotateCW:  ActionCallback;
      onRotateCCW: ActionCallback;
    }
  ) {
    this.container = scene.add.container(0, 0);

    const configs: ButtonConfig[] = [
      // ── 左侧（从上到下）：软下落 / 逆时针旋转 / 向左移动 ─────────────────────
      {
        x: LEFT_X,  y: BTN_Y[0], width: BTN_W, height: BTN_H,
        label: '↓', sublabel: '软落',
        bgColor: 0x223355, alpha: 0.80, repeatable: true,
        callback: callbacks.onSoftDrop,
      },
      {
        x: LEFT_X,  y: BTN_Y[1], width: BTN_W, height: BTN_H,
        label: '↺', sublabel: '逆转',
        bgColor: 0x334422, alpha: 0.80, repeatable: false,
        callback: callbacks.onRotateCCW,
      },
      {
        x: LEFT_X,  y: BTN_Y[2], width: BTN_W, height: BTN_H,
        label: '←', sublabel: '左移',
        bgColor: 0x223355, alpha: 0.80, repeatable: true,
        callback: callbacks.onMoveLeft,
      },
      // ── 右侧（从上到下）：瞬间落地 / 顺时针旋转 / 向右移动 ───────────────────
      {
        x: RIGHT_X, y: BTN_Y[0], width: BTN_W, height: BTN_H,
        label: '⬇', sublabel: '落地',
        bgColor: 0x442222, alpha: 0.80, repeatable: false,
        callback: callbacks.onHardDrop,
      },
      {
        x: RIGHT_X, y: BTN_Y[1], width: BTN_W, height: BTN_H,
        label: '↻', sublabel: '顺转',
        bgColor: 0x334422, alpha: 0.80, repeatable: false,
        callback: callbacks.onRotateCW,
      },
      {
        x: RIGHT_X, y: BTN_Y[2], width: BTN_W, height: BTN_H,
        label: '→', sublabel: '右移',
        bgColor: 0x223355, alpha: 0.80, repeatable: true,
        callback: callbacks.onMoveRight,
      },
    ];

    for (const cfg of configs) {
      this.createButton(scene, cfg);
    }

    // PC（非触屏）自动隐藏
    if (!scene.sys.game.device.input.touch) {
      this.container.setVisible(false);
    }
  }

  private createButton(scene: Phaser.Scene, cfg: ButtonConfig): void {
    const btn = scene.add.container(cfg.x, cfg.y);

    const bg = scene.add.rectangle(
      cfg.width / 2, cfg.height / 2,
      cfg.width, cfg.height,
      cfg.bgColor, cfg.alpha
    ).setStrokeStyle(1, 0x6688aa, 0.6);

    const labelText = scene.add.text(cfg.width / 2, cfg.height / 2 - 9, cfg.label, {
      fontSize: '22px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const subText = scene.add.text(cfg.width / 2, cfg.height / 2 + 15, cfg.sublabel, {
      fontSize: '11px', color: '#aabbcc', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    btn.add([bg, labelText, subText]);
    btn.setSize(cfg.width, cfg.height);
    btn.setInteractive();

    btn.on('pointerdown', () => {
      bg.setFillStyle(cfg.bgColor, Math.min(cfg.alpha + 0.15, 1));
      bg.setStrokeStyle(2, 0xaaccff, 1);
      cfg.callback(); // 立即触发一次

      if (cfg.repeatable) {
        this.repeatTimers.set(btn, { delay: REPEAT_DELAY, interval: 0, callback: cfg.callback });
      }
    });

    const onRelease = () => {
      bg.setFillStyle(cfg.bgColor, cfg.alpha);
      bg.setStrokeStyle(1, 0x6688aa, 0.6);
      this.repeatTimers.delete(btn);
    };
    btn.on('pointerup', onRelease);
    btn.on('pointerout', onRelease);

    this.container.add(btn);
  }

  /** 每帧由 GameScene.update() 调用 */
  update(delta: number): void {
    for (const timer of this.repeatTimers.values()) {
      if (timer.delay > 0) {
        timer.delay -= delta;
        continue;
      }
      // DAS 已触发，进入 ARR
      timer.interval += delta;
      while (timer.interval >= REPEAT_INTERVAL) {
        timer.interval -= REPEAT_INTERVAL;
        timer.callback();
      }
    }
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
