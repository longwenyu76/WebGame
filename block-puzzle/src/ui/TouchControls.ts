import Phaser from 'phaser';
import { FONT_FAMILY, CANVAS_WIDTH, TOUCH_ZONE_Y, CANVAS_HEIGHT } from '../constants/GameConstants';

type ActionCallback = () => void;

const REPEAT_DELAY    = 150;
const REPEAT_INTERVAL = 50;

// 3列 × 2行布局
const COL_W   = Math.floor(CANVAS_WIDTH / 3);  // 160
const BTN_H   = 66;
const ROW_GAP = 6;
const ROW1_Y  = TOUCH_ZONE_Y + 4;
const ROW2_Y  = ROW1_Y + BTN_H + ROW_GAP;

// 按钮定义
const LAYOUT = [
  { row: 0, col: 0, label: '↺', sub: '逆转', color: 0x1e2e14, rep: false, key: 'onRotateCCW' },
  { row: 0, col: 1, label: '⬇', sub: '落地', color: 0x3a1010, rep: false, key: 'onHardDrop'  },
  { row: 0, col: 2, label: '↻', sub: '顺转', color: 0x1e2e14, rep: false, key: 'onRotateCW'  },
  { row: 1, col: 0, label: '←', sub: '左移', color: 0x1a2a44, rep: true,  key: 'onMoveLeft'  },
  { row: 1, col: 2, label: '→', sub: '右移', color: 0x1a2a44, rep: true,  key: 'onMoveRight' },
] as const;

type Callbacks = {
  onMoveLeft:  ActionCallback;
  onMoveRight: ActionCallback;
  onSoftDrop:  ActionCallback;
  onHardDrop:  ActionCallback;
  onRotateCW:  ActionCallback;
  onRotateCCW: ActionCallback;
};

interface BtnDef {
  bounds:     Phaser.Geom.Rectangle;  // 逻辑坐标矩形，用于手动碰撞检测
  bg:         Phaser.GameObjects.Rectangle;
  bgColor:    number;
  repeatable: boolean;
  callback:   ActionCallback;
}

interface PointerState {
  btn:      BtnDef;
  delay:    number;
  interval: number;
}

export class TouchControls {
  private buttons: BtnDef[] = [];
  private pointerStates = new Map<number, PointerState>();
  private container: Phaser.GameObjects.Container;
  private visible = true;

  constructor(scene: Phaser.Scene, callbacks: Callbacks) {
    this.container = scene.add.container(0, 0);

    // 按钮区背景
    this.container.add([
      scene.add.rectangle(
        CANVAS_WIDTH / 2,
        TOUCH_ZONE_Y + (CANVAS_HEIGHT - TOUCH_ZONE_Y) / 2,
        CANVAS_WIDTH, CANVAS_HEIGHT - TOUCH_ZONE_Y,
        0x080810, 1
      ),
      scene.add.rectangle(
        CANVAS_WIDTH / 2, TOUCH_ZONE_Y,
        CANVAS_WIDTH, 2, 0x334466, 0.8
      ),
    ]);

    // 创建各按钮的视觉元素 + 碰撞矩形
    for (const def of LAYOUT) {
      const bx = def.col * COL_W;
      const by = def.row === 0 ? ROW1_Y : ROW2_Y;

      const bg = scene.add.rectangle(
        bx + COL_W / 2, by + BTN_H / 2,
        COL_W - 2, BTN_H - 2,
        def.color, 0.92
      ).setStrokeStyle(1, 0x4466aa, 0.5);

      const labelTxt = scene.add.text(bx + COL_W / 2, by + BTN_H / 2 - 10, def.label, {
        fontSize: '26px', color: '#ffffff', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);

      const subTxt = scene.add.text(bx + COL_W / 2, by + BTN_H / 2 + 16, def.sub, {
        fontSize: '13px', color: '#99bbcc', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);

      this.container.add([bg, labelTxt, subTxt]);

      this.buttons.push({
        bounds:     new Phaser.Geom.Rectangle(bx, by, COL_W, BTN_H),
        bg,
        bgColor:    def.color,
        repeatable: def.rep,
        callback:   callbacks[def.key],
      });
    }

    // ── 核心修复：直接用场景级 pointer 事件 + 手动坐标检测 ───────────────────
    // 不使用 Container/GameObject 的 setInteractive()，彻底规避 Phaser
    // 嵌套 Container 的坐标转换 bug。
    // pointer.x / pointer.y 已由 Scale Manager 转换为逻辑坐标（0-480, 0-780）。
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointerup',   this.onUp,   this);

    // PC（非触屏）隐藏
    if (!scene.sys.game.device.input.touch) {
      this.setVisible(false);
    }
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.visible) return;
    const btn = this.hitTest(pointer.x, pointer.y);
    if (!btn) return;

    btn.bg.setFillStyle(btn.bgColor, 1);
    btn.bg.setStrokeStyle(2, 0x88ccff, 1);
    btn.callback();

    if (btn.repeatable) {
      this.pointerStates.set(pointer.id, { btn, delay: REPEAT_DELAY, interval: 0 });
    }
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    const state = this.pointerStates.get(pointer.id);
    if (!state) return;
    state.btn.bg.setFillStyle(state.btn.bgColor, 0.92);
    state.btn.bg.setStrokeStyle(1, 0x4466aa, 0.5);
    this.pointerStates.delete(pointer.id);
  }

  private hitTest(x: number, y: number): BtnDef | undefined {
    return this.buttons.find(b => b.bounds.contains(x, y));
  }

  update(delta: number): void {
    for (const state of this.pointerStates.values()) {
      if (state.delay > 0) { state.delay -= delta; continue; }
      state.interval += delta;
      while (state.interval >= REPEAT_INTERVAL) {
        state.interval -= REPEAT_INTERVAL;
        state.btn.callback();
      }
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.setVisible(visible);
  }
}
