import Phaser from 'phaser';
import { FONT_FAMILY, CANVAS_WIDTH, TOUCH_ZONE_Y, CANVAS_HEIGHT } from '../constants/GameConstants';

type ActionCallback = () => void;

const REPEAT_DELAY    = 150;
const REPEAT_INTERVAL = 50;

// ── 按钮区布局（3列 × 2行，位于游戏区正下方）────────────────────────────────────
//
//  行1: [ ← 左移 ] [ ↓ 软落 ] [ → 右移 ]
//  行2: [ ↺ 逆转 ] [ ⬇ 落地 ] [ ↻ 顺转 ]
//
const COL_W  = Math.floor(CANVAS_WIDTH / 3);   // 160
const BTN_H  = 66;
const ROW_GAP = 6;
const ROW1_Y = TOUCH_ZONE_Y + 4;
const ROW2_Y = ROW1_Y + BTN_H + ROW_GAP;

interface ButtonConfig {
  col: number;          // 0 / 1 / 2
  row: number;          // 0 / 1
  label: string;
  sublabel: string;
  bgColor: number;
  repeatable: boolean;
  callback: ActionCallback;
}

export class TouchControls {
  private container: Phaser.GameObjects.Container;
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

    // 按钮区背景
    const zoneBg = scene.add.rectangle(
      CANVAS_WIDTH / 2, TOUCH_ZONE_Y + (CANVAS_HEIGHT - TOUCH_ZONE_Y) / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT - TOUCH_ZONE_Y,
      0x080810, 1
    );
    // 分隔线
    const divider = scene.add.rectangle(
      CANVAS_WIDTH / 2, TOUCH_ZONE_Y,
      CANVAS_WIDTH, 2,
      0x334466, 0.8
    );
    this.container.add([zoneBg, divider]);

    const configs: ButtonConfig[] = [
      // 行1
      { col: 0, row: 0, label: '←', sublabel: '左移', bgColor: 0x1a2a44, repeatable: true,  callback: callbacks.onMoveLeft  },
      { col: 1, row: 0, label: '↓', sublabel: '软落', bgColor: 0x1a2a44, repeatable: true,  callback: callbacks.onSoftDrop  },
      { col: 2, row: 0, label: '→', sublabel: '右移', bgColor: 0x1a2a44, repeatable: true,  callback: callbacks.onMoveRight },
      // 行2
      { col: 0, row: 1, label: '↺', sublabel: '逆转', bgColor: 0x1e2e14, repeatable: false, callback: callbacks.onRotateCCW },
      { col: 1, row: 1, label: '⬇', sublabel: '落地', bgColor: 0x3a1010, repeatable: false, callback: callbacks.onHardDrop  },
      { col: 2, row: 1, label: '↻', sublabel: '顺转', bgColor: 0x1e2e14, repeatable: false, callback: callbacks.onRotateCW  },
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
    const x = cfg.col * COL_W;
    const y = cfg.row === 0 ? ROW1_Y : ROW2_Y;

    const btn = scene.add.container(x, y);

    const bg = scene.add.rectangle(
      COL_W / 2, BTN_H / 2,
      COL_W - 2, BTN_H - 2,
      cfg.bgColor, 0.92
    ).setStrokeStyle(1, 0x4466aa, 0.5);

    const labelText = scene.add.text(COL_W / 2, BTN_H / 2 - 10, cfg.label, {
      fontSize: '26px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const subText = scene.add.text(COL_W / 2, BTN_H / 2 + 16, cfg.sublabel, {
      fontSize: '13px', color: '#99bbcc', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    btn.add([bg, labelText, subText]);
    btn.setSize(COL_W, BTN_H);
    btn.setInteractive();

    btn.on('pointerdown', () => {
      bg.setFillStyle(cfg.bgColor, 1);
      bg.setStrokeStyle(2, 0x88ccff, 1);
      cfg.callback();
      if (cfg.repeatable) {
        this.repeatTimers.set(btn, { delay: REPEAT_DELAY, interval: 0, callback: cfg.callback });
      }
    });

    const onRelease = () => {
      bg.setFillStyle(cfg.bgColor, 0.92);
      bg.setStrokeStyle(1, 0x4466aa, 0.5);
      this.repeatTimers.delete(btn);
    };
    btn.on('pointerup',  onRelease);
    btn.on('pointerout', onRelease);

    this.container.add(btn);
  }

  update(delta: number): void {
    for (const timer of this.repeatTimers.values()) {
      if (timer.delay > 0) {
        timer.delay -= delta;
        continue;
      }
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
