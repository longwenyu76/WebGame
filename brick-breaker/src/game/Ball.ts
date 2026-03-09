export class Ball {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  readonly radius: number;
  active = false;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  get speed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  /**
   * Set velocity from angle (degrees from vertical, positive = rightward)
   * and speed. Upward travel = vy < 0.
   */
  setVelocityFromAngle(angleDeg: number, speed: number): void {
    const rad = angleDeg * Math.PI / 180;
    this.vx = speed * Math.sin(rad);
    this.vy = -speed * Math.cos(rad);
  }

  /** Launch upward with a small random jitter (±5°). */
  launch(speed: number): void {
    const jitter = (Math.random() - 0.5) * 10;
    this.setVelocityFromAngle(jitter, speed);
    this.active = true;
  }

  /** Advance position by dt seconds. */
  update(dt: number): void {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}
