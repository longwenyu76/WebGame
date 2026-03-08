import Phaser from 'phaser';
import { DAS_DELAY, ARR_INTERVAL } from '../constants/GameConstants';

type ActionCallback = () => void;

// 软下落速度：每 50ms 下落一格
const SOFT_DROP_INTERVAL = 50;

export class InputManager {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ: Phaser.Input.Keyboard.Key;
  private keyX: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;
  private keyP: Phaser.Input.Keyboard.Key;
  private keyR: Phaser.Input.Keyboard.Key;

  // DAS/ARR 状态（仅左右移动）
  private dasDirection: 'left' | 'right' | null = null;
  private dasTimer: number = 0;
  private arrTimer: number = 0;

  // 软下落计时器
  private softDropTimer: number = 0;

  // 回调（GameScene 注入）
  onMoveLeft?: ActionCallback;
  onMoveRight?: ActionCallback;
  onSoftDrop?: ActionCallback;
  onHardDrop?: ActionCallback;
  onRotateCW?: ActionCallback;
  onRotateCCW?: ActionCallback;
  onPause?: ActionCallback;
  onRestart?: ActionCallback;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keyZ     = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX     = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keySpace = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyP     = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyR     = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  update(delta: number): void {
    const JD = Phaser.Input.Keyboard.JustDown;

    // ── 单次触发按键 ──────────────────────────────────────────────────────────
    if (JD(this.keySpace))                        this.onHardDrop?.();
    if (JD(this.keyZ) || JD(this.cursors.up!))    this.onRotateCW?.();
    if (JD(this.keyX))                            this.onRotateCCW?.();
    if (JD(this.keyP))                            this.onPause?.();
    if (JD(this.keyR))                            this.onRestart?.();

    // ── 软下落（持续按 ↓，每 50ms 下落一格）───────────────────────────────────
    if (this.cursors.down!.isDown) {
      this.softDropTimer += delta;
      while (this.softDropTimer >= SOFT_DROP_INTERVAL) {
        this.softDropTimer -= SOFT_DROP_INTERVAL;
        this.onSoftDrop?.();
      }
    } else {
      this.softDropTimer = 0;
    }

    // ── 左右移动 DAS/ARR ──────────────────────────────────────────────────────
    const leftDown  = this.cursors.left!.isDown;
    const rightDown = this.cursors.right!.isDown;

    if (leftDown && !rightDown) {
      this.handleDAS('left', delta);
    } else if (rightDown && !leftDown) {
      this.handleDAS('right', delta);
    } else {
      // 两键同时按下或都未按：重置 DAS
      this.dasDirection = null;
      this.dasTimer = 0;
      this.arrTimer = 0;
    }
  }

  private handleDAS(dir: 'left' | 'right', delta: number): void {
    const callback = dir === 'left' ? this.onMoveLeft : this.onMoveRight;

    if (this.dasDirection !== dir) {
      // 刚按下：立即触发一次，重置计时器
      this.dasDirection = dir;
      this.dasTimer = 0;
      this.arrTimer = 0;
      callback?.();
      return;
    }

    // 持续按住：等待 DAS 延迟
    this.dasTimer += delta;
    if (this.dasTimer < DAS_DELAY) return;

    // DAS 触发后：以 ARR 频率连续移动
    this.arrTimer += delta;
    while (this.arrTimer >= ARR_INTERVAL) {
      this.arrTimer -= ARR_INTERVAL;
      callback?.();
    }
  }

  reset(): void {
    this.dasDirection = null;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.softDropTimer = 0;
  }
}
