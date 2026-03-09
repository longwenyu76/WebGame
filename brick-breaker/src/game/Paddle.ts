import { CANVAS_WIDTH } from '../constants/GameConstants';

export class Paddle {
  x: number;      // center x
  readonly y: number;  // center y (fixed)
  width: number;
  readonly height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;  this.y = y;
    this.width = width;  this.height = height;
  }

  get left():   number { return this.x - this.width  / 2; }
  get right():  number { return this.x + this.width  / 2; }
  get top():    number { return this.y - this.height / 2; }
  get bottom(): number { return this.y + this.height / 2; }

  /** Move paddle center to targetX, clamped within canvas. */
  moveTo(targetX: number): void {
    const half = this.width / 2;
    this.x = Math.max(half, Math.min(CANVAS_WIDTH - half, targetX));
  }

  /**
   * Returns reflection angle in degrees from vertical.
   * Left edge → -60°, centre → 0°, right edge → +60°.
   */
  getReflectAngle(ballX: number): number {
    const ratio = Math.max(0, Math.min(1, (ballX - this.left) / this.width));
    return (ratio - 0.5) * 120;
  }
}
