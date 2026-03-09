import Phaser from 'phaser';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  BRICK_W, BRICK_H,
  PADDLE_W_NORMAL, PADDLE_H, PADDLE_Y,
  PADDLE_SCALE_MAX, PADDLE_SCALE_MIN,
  BALL_RADIUS, BALL_SPEED_BASE, BALL_SPEED_PER_LEVEL, BALL_SPEED_MAX, BALL_MAX_COUNT,
  POWERUP_FALL_SPEED, POWERUP_W, POWERUP_H,
  INITIAL_LIVES, SCORE,
  SCENE_KEYS, FONT_FAMILY,
  NORMAL_BRICK_COLORS,
  REINFORCED_BRICK_COLOR, SOLID_BRICK_COLOR, IRON_BRICK_COLOR, POWERUP_BRICK_COLOR,
  POWERUP_COLORS, POWERUP_LABELS,
  PowerupType,
} from '../constants/GameConstants';
import { LEVELS }    from '../data/levels';
import { Ball }      from '../game/Ball';
import { Paddle }    from '../game/Paddle';
import { BrickGrid, BrickState } from '../game/BrickGrid';
import { AudioManager }          from '../game/AudioManager';

const TOP_WALL_Y     = 50;
const BALL_LOSS_Y    = CANVAS_HEIGHT;
const PADDLE_SPEED   = 420;
const FLASH_TIME     = 0.10;
const PARTICLE_COUNT = 6;

// ── Local types ───────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: number;
  alpha: number;
  life:  number;
  size:  number;
}

interface PowerupDrop {
  type:  PowerupType;
  x:     number;
  y:     number;
  label: Phaser.GameObjects.Text;
}

// ─────────────────────────────────────────────────────────────────────────────
export class GameScene extends Phaser.Scene {
  // ── game objects ──────────────────────────────────────────────────────────
  private balls:      Ball[]    = [];
  private paddle!:    Paddle;
  private brickGrid!: BrickGrid;
  private audio!:     AudioManager;

  // ── game state ────────────────────────────────────────────────────────────
  private levelIndex      = 0;
  private score           = 0;
  private lives           = INITIAL_LIVES;
  private waitingToLaunch = true;
  private isPaused        = false;

  // ── power-up state (reset each level) ────────────────────────────────────
  private paddleScale    = 1.0;
  private ballSpeedScale = 1.0;
  private fireBall       = false;
  private powerupDrops:  PowerupDrop[] = [];

  // ── visual effects ────────────────────────────────────────────────────────
  private flashMap:  Map<BrickState, number> = new Map();
  private particles: Particle[]              = [];
  private ballTrails: { x: number; y: number; alpha: number }[] = [];

  // ── Phaser display objects ────────────────────────────────────────────────
  private gfx!:       Phaser.GameObjects.Graphics;
  private txtLevel!:  Phaser.GameObjects.Text;
  private txtScore!:  Phaser.GameObjects.Text;
  private txtLives!:  Phaser.GameObjects.Text;
  private txtBuffs!:  Phaser.GameObjects.Text;  // active power-up strip
  private txtHint!:   Phaser.GameObjects.Text;

  // ── input ─────────────────────────────────────────────────────────────────
  private cursors!:  Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!:     Phaser.Input.Keyboard.Key;
  private keyD!:     Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyP!:     Phaser.Input.Keyboard.Key;
  private pointerX   = CANVAS_WIDTH / 2;
  private usingMouse = false;

  constructor() { super({ key: SCENE_KEYS.GAME }); }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API (called by PauseScene)
  // ─────────────────────────────────────────────────────────────────────────
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.scene.launch(SCENE_KEYS.PAUSE);
    } else {
      this.scene.stop(SCENE_KEYS.PAUSE);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  create(data: { levelIndex?: number; score?: number; lives?: number }): void {
    this.levelIndex = data?.levelIndex ?? 0;
    this.score      = data?.score      ?? 0;
    this.lives      = data?.lives      ?? INITIAL_LIVES;

    this.paddleScale     = 1.0;
    this.ballSpeedScale  = 1.0;
    this.fireBall        = false;
    this.powerupDrops    = [];
    this.waitingToLaunch = true;
    this.isPaused        = false;
    this.usingMouse      = false;
    this.pointerX        = CANVAS_WIDTH / 2;
    this.flashMap        = new Map();
    this.particles       = [];
    this.ballTrails      = [];

    this.audio     = new AudioManager();
    this.brickGrid = new BrickGrid(LEVELS[this.levelIndex]);
    this.paddle    = new Paddle(CANVAS_WIDTH / 2, PADDLE_Y, PADDLE_W_NORMAL, PADDLE_H);
    this.balls     = [];
    this.spawnBallOnPaddle();

    this.gfx = this.add.graphics();

    // ── HUD ────────────────────────────────────────────────────────────────
    this.txtLevel = this.add.text(8, 8, '', {
      fontSize: '15px', color: '#aaaaee', fontFamily: FONT_FAMILY,
    });
    this.txtScore = this.add.text(8, 26, '', {
      fontSize: '15px', color: '#ffffff', fontFamily: FONT_FAMILY,
    });
    this.txtLives = this.add.text(CANVAS_WIDTH - 8, 8, '', {
      fontSize: '15px', color: '#ff88aa', fontFamily: FONT_FAMILY,
    }).setOrigin(1, 0);

    const pauseBtn = this.add.text(CANVAS_WIDTH - 8, 26, '[ P 暂停 ]', {
      fontSize: '13px', color: '#666688', fontFamily: FONT_FAMILY,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.togglePause());

    // Active power-up status strip — bottom of screen, below paddle area
    this.txtBuffs = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14, '', {
      fontSize: '12px', color: '#aaaacc', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 1).setDepth(5);

    this.txtHint = this.add.text(CANVAS_WIDTH / 2, PADDLE_Y - 28, '点击或按空格键发球', {
      fontSize: '14px', color: '#887744', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    // ── Input ───────────────────────────────────────────────────────────────
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.keyA     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyP     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      this.pointerX = ptr.x; this.usingMouse = true;
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.pointerX = ptr.x; this.usingMouse = true;
      if (this.waitingToLaunch && !this.isPaused) this.launchBall();
    });
  }

  update(_time: number, delta: number): void {
    if (this.isPaused) return;

    const dt = Math.min(delta / 1000, 0.05);

    if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
      this.togglePause(); return;
    }

    this.updatePaddle(dt);

    if (this.waitingToLaunch) {
      if (Phaser.Input.Keyboard.JustDown(this.keySpace)) this.launchBall();
      const b = this.balls[0];
      if (b) { b.x = this.paddle.x; b.y = this.paddle.top - b.radius; }
    } else {
      for (const ball of this.balls) {
        ball.update(dt);
        this.handleWallCollisions(ball);
        this.handleBrickCollisions(ball);
        this.handlePaddleCollision(ball);
      }

      if (this.fireBall) this.recordTrails();

      const prevCount = this.balls.length;
      this.balls = this.balls.filter(b => b.y - b.radius < BALL_LOSS_Y);
      if (this.balls.length === 0 && prevCount > 0) {
        this.loseLife(); return;
      }

      if (!this.brickGrid.hasDestroyableBricks()) {
        this.levelClear(); return;
      }
    }

    this.updatePowerupDrops(dt);
    this.updateParticles(dt);
    this.updateFlashMap(dt);
    this.updateHUD();
    this.drawAll();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Paddle
  // ─────────────────────────────────────────────────────────────────────────
  private updatePaddle(dt: number): void {
    const left  = this.cursors.left.isDown  || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    if (left)            { this.usingMouse = false; this.paddle.moveTo(this.paddle.x - PADDLE_SPEED * dt); }
    else if (right)      { this.usingMouse = false; this.paddle.moveTo(this.paddle.x + PADDLE_SPEED * dt); }
    else if (this.usingMouse) { this.paddle.moveTo(this.pointerX); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ball helpers
  // ─────────────────────────────────────────────────────────────────────────
  private spawnBallOnPaddle(): void {
    this.balls.push(new Ball(this.paddle.x, this.paddle.top - BALL_RADIUS, BALL_RADIUS));
  }

  private launchBall(): void {
    this.balls[0].launch(this.getBallSpeed());
    this.waitingToLaunch = false;
    this.txtHint.setVisible(false);
  }

  private getBallSpeed(): number {
    const base = Math.min(BALL_SPEED_BASE + this.levelIndex * BALL_SPEED_PER_LEVEL, BALL_SPEED_MAX);
    return Math.min(base * this.ballSpeedScale, BALL_SPEED_MAX);
  }

  private recordTrails(): void {
    for (const ball of this.balls) {
      if (ball.active) this.ballTrails.push({ x: ball.x, y: ball.y, alpha: 0.45 });
    }
    if (this.ballTrails.length > this.balls.length * 10) this.ballTrails.shift();
    for (const t of this.ballTrails) t.alpha *= 0.80;
    this.ballTrails = this.ballTrails.filter(t => t.alpha > 0.02);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Collisions
  // ─────────────────────────────────────────────────────────────────────────
  private handleWallCollisions(ball: Ball): void {
    const r = ball.radius;
    if (ball.x - r < 0)            { ball.x = r;                ball.vx =  Math.abs(ball.vx); this.audio.playWallHit(); }
    if (ball.x + r > CANVAS_WIDTH) { ball.x = CANVAS_WIDTH - r; ball.vx = -Math.abs(ball.vx); this.audio.playWallHit(); }
    if (ball.y - r < TOP_WALL_Y)   { ball.y = TOP_WALL_Y + r;   ball.vy =  Math.abs(ball.vy); this.audio.playWallHit(); }
  }

  private handlePaddleCollision(ball: Ball): void {
    if (ball.vy <= 0) return;
    const { paddle } = this;
    const r = ball.radius;
    if (
      ball.x + r > paddle.left  && ball.x - r < paddle.right &&
      ball.y + r > paddle.top   && ball.y - r < paddle.bottom
    ) {
      ball.y = paddle.top - r;
      ball.setVelocityFromAngle(paddle.getReflectAngle(ball.x), ball.speed);
      this.audio.playPaddleHit();
    }
  }

  private handleBrickCollisions(ball: Ball): void {
    const r = ball.radius;

    for (const brick of this.brickGrid.getActiveBricks()) {
      const eL = brick.x        - r, eR = brick.x + BRICK_W + r;
      const eT = brick.y        - r, eB = brick.y + BRICK_H + r;
      if (ball.x < eL || ball.x > eR || ball.y < eT || ball.y > eB) continue;

      const isIron = brick.type === 'iron';

      if (isIron) {
        // Iron is immune to all damage — always reflects, even fire ball.
        this.reflectBall(ball, eL, eR, eT, eB);
        break;
      }

      // Non-iron: apply damage
      const damage = this.fireBall ? 2 : 1;
      const result = this.brickGrid.hit(brick, damage);

      if (result.score > 0) {
        this.score += result.score;
        this.showScorePopup(brick.x + BRICK_W / 2, brick.y, result.score);
      }
      if (result.destroyed) {
        this.spawnParticles(brick);
        this.audio.playBrickDestroy(brick.maxHp);
        if (result.powerup) this.dropPowerup(result.powerup, brick.x + BRICK_W / 2, brick.y + BRICK_H / 2);
      } else {
        this.flashMap.set(brick, FLASH_TIME);
        this.fireBall ? this.audio.playFireBrickHit() : this.audio.playBrickHit();
      }

      if (this.fireBall) continue; // fire ball penetrates non-iron bricks

      // Normal ball: reflect and stop
      this.reflectBall(ball, eL, eR, eT, eB);
      break;
    }
  }

  private reflectBall(ball: Ball, eL: number, eR: number, eT: number, eB: number): void {
    const dL = ball.x - eL, dR = eR - ball.x;
    const dT = ball.y - eT, dB = eB - ball.y;
    if (Math.min(dL, dR) < Math.min(dT, dB)) {
      if (dL < dR) { ball.vx = -Math.abs(ball.vx); ball.x = eL; }
      else         { ball.vx =  Math.abs(ball.vx); ball.x = eR; }
    } else {
      if (dT < dB) { ball.vy = -Math.abs(ball.vy); ball.y = eT; }
      else         { ball.vy =  Math.abs(ball.vy); ball.y = eB; }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Power-ups
  // ─────────────────────────────────────────────────────────────────────────
  private dropPowerup(type: PowerupType, x: number, y: number): void {
    const label = this.add.text(x, y, POWERUP_LABELS[type] ?? '?', {
      fontSize: '11px', color: '#ffffff', fontFamily: FONT_FAMILY,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.powerupDrops.push({ type, x, y, label });
  }

  private updatePowerupDrops(dt: number): void {
    const { paddle } = this;
    const toRemove: number[] = [];

    for (let i = 0; i < this.powerupDrops.length; i++) {
      const drop = this.powerupDrops[i];
      drop.y        += POWERUP_FALL_SPEED * dt;
      drop.label.y   = drop.y;

      const hw = POWERUP_W / 2, hh = POWERUP_H / 2;
      if (
        drop.x + hw > paddle.left  && drop.x - hw < paddle.right &&
        drop.y + hh > paddle.top   && drop.y - hh < paddle.bottom
      ) {
        this.applyPowerup(drop.type);
        this.audio.playPowerupCollect(drop.type);
        drop.label.destroy();
        toRemove.push(i);
      } else if (drop.y - hh > CANVAS_HEIGHT) {
        drop.label.destroy();
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) this.powerupDrops.splice(toRemove[i], 1);
  }

  private applyPowerup(type: PowerupType): void {
    switch (type) {
      case 'wide_paddle':
        this.paddleScale  = Math.min(this.paddleScale * 1.5, PADDLE_SCALE_MAX);
        this.paddle.width = PADDLE_W_NORMAL * this.paddleScale;
        break;
      case 'narrow_paddle':
        this.paddleScale  = Math.max(this.paddleScale * 0.75, PADDLE_SCALE_MIN);
        this.paddle.width = PADDLE_W_NORMAL * this.paddleScale;
        break;
      case 'fast_ball':
        this.ballSpeedScale = Math.min(this.ballSpeedScale * 1.25, 2.0);
        this.rescaleBalls();
        break;
      case 'slow_ball':
        this.ballSpeedScale = Math.max(this.ballSpeedScale * 0.8, 0.5);
        this.rescaleBalls();
        break;
      case 'fire_ball':
        this.fireBall = true;
        break;
      case 'multi_ball':
        this.spawnMultiBalls();
        break;
      case 'extra_life':
        this.lives += 1;
        break;
    }
  }

  private rescaleBalls(): void {
    const newSpeed = this.getBallSpeed();
    for (const ball of this.balls) {
      const s = ball.speed;
      if (s > 0) { ball.vx = (ball.vx / s) * newSpeed; ball.vy = (ball.vy / s) * newSpeed; }
    }
  }

  private spawnMultiBalls(): void {
    const sources = this.balls.filter(b => b.active).slice();
    for (const src of sources) {
      const baseAngle = Math.atan2(src.vx, -src.vy) * (180 / Math.PI);
      // 原球保持方向，再额外生成7个球，共8个，每隔45°一个
      for (let i = 1; i < 8; i++) {
        if (this.balls.length >= BALL_MAX_COUNT) return;
        const nb = new Ball(src.x, src.y, src.radius);
        nb.setVelocityFromAngle(baseAngle + i * 45, src.speed);
        nb.active = true;
        this.balls.push(nb);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Visual effects
  // ─────────────────────────────────────────────────────────────────────────
  private spawnParticles(brick: BrickState): void {
    const color = getBrickBaseColor(brick);
    const cx = brick.x + BRICK_W / 2, cy = brick.y + BRICK_H / 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 60 + Math.random() * 110;
      this.particles.push({
        x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color, alpha: 1.0, life: 0.5 + Math.random() * 0.2, size: 2 + Math.random() * 3,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 220 * dt; // gravity
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.6);
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateFlashMap(dt: number): void {
    for (const [brick, t] of this.flashMap) {
      const next = t - dt;
      if (next <= 0) this.flashMap.delete(brick);
      else           this.flashMap.set(brick, next);
    }
  }

  private showScorePopup(x: number, y: number, value: number): void {
    const color = value >= SCORE.SOLID ? '#66ffff' : value >= SCORE.REINFORCED ? '#ffdd44' : '#ffffff';
    const txt   = this.add.text(x, y, `+${value}`, {
      fontSize: '13px', color, fontFamily: FONT_FAMILY,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: txt, y: y - 38, alpha: 0, duration: 680, ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Life management
  // ─────────────────────────────────────────────────────────────────────────
  private loseLife(): void {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.audio.playGameOver();
      this.time.delayedCall(600, () => this.triggerGameOver());
    } else {
      this.audio.playLifeLost();
      this.clearPowerupState();
      this.resetBallOnPaddle();
      this.drawAll();
    }
  }

  /** Reset all level power-up effects when a life is lost. */
  private clearPowerupState(): void {
    this.paddleScale    = 1.0;
    this.ballSpeedScale = 1.0;
    this.fireBall       = false;
    this.paddle.width   = PADDLE_W_NORMAL;
    // Destroy any falling power-up drops
    for (const drop of this.powerupDrops) drop.label.destroy();
    this.powerupDrops = [];
  }

  private resetBallOnPaddle(): void {
    this.balls           = [];
    this.ballTrails      = [];
    this.waitingToLaunch = true;
    this.spawnBallOnPaddle();
    this.txtHint.setVisible(true);
  }

  private triggerGameOver(): void {
    this.scene.start(SCENE_KEYS.GAME_OVER, { score: this.score, levelIndex: this.levelIndex });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Level clear
  // ─────────────────────────────────────────────────────────────────────────
  private levelClear(): void {
    const bonus     = SCORE.LEVEL_CLEAR_BASE * (this.levelIndex + 1);
    this.score     += bonus;
    const nextIndex = this.levelIndex + 1;
    this.audio.playLevelClear();

    if (nextIndex >= LEVELS.length) {
      this.time.delayedCall(800, () => {
        this.scene.start(SCENE_KEYS.GAME_CLEAR, { score: this.score, lives: this.lives });
      });
    } else {
      this.time.delayedCall(800, () => {
        this.scene.start(SCENE_KEYS.LEVEL_CLEAR, {
          levelIndex: this.levelIndex, score: this.score, lives: this.lives, bonus,
        });
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HUD
  // ─────────────────────────────────────────────────────────────────────────
  private updateHUD(): void {
    const lv = LEVELS[this.levelIndex];
    this.txtLevel.setText(`第 ${this.levelIndex + 1} 关 · ${lv.name}`);
    this.txtScore.setText(`分: ${this.score}`);
    this.txtLives.setText(`命: ${'♥'.repeat(Math.max(0, this.lives))}`);
    this.txtBuffs.setText(this.buildBuffString());
  }

  /** Build the active-power-up status strip shown between HUD rows and bricks. */
  private buildBuffString(): string {
    const parts: string[] = [];
    if (this.fireBall)           parts.push('🔥火球');
    if (this.paddleScale > 1.05) parts.push(`板↑×${this.paddleScale.toFixed(1)}`);
    if (this.paddleScale < 0.95) parts.push(`板↓×${this.paddleScale.toFixed(2)}`);
    if (this.ballSpeedScale > 1.05) parts.push(`速↑×${this.ballSpeedScale.toFixed(2)}`);
    if (this.ballSpeedScale < 0.95) parts.push(`速↓×${this.ballSpeedScale.toFixed(2)}`);
    if (this.balls.length > 1)  parts.push(`球×${this.balls.length}`);
    return parts.join('  ');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  private drawAll(): void {
    this.gfx.clear();
    this.drawBoundary();
    this.drawTrails();
    this.drawParticles();
    this.drawBricks();
    this.drawPowerupDrops();
    this.drawPaddle();
    this.drawBalls();
  }

  private drawBoundary(): void {
    const g = this.gfx;
    // U-shaped play boundary: top + left + right walls, open at bottom
    // Outer glow
    g.lineStyle(6, 0x3355aa, 0.18);
    g.beginPath();
    g.moveTo(0,            CANVAS_HEIGHT);
    g.lineTo(0,            TOP_WALL_Y);
    g.lineTo(CANVAS_WIDTH, TOP_WALL_Y);
    g.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    g.strokePath();
    // Inner crisp line
    g.lineStyle(2, 0x5577cc, 0.65);
    g.beginPath();
    g.moveTo(0,            CANVAS_HEIGHT);
    g.lineTo(0,            TOP_WALL_Y);
    g.lineTo(CANVAS_WIDTH, TOP_WALL_Y);
    g.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    g.strokePath();
  }

  private drawBricks(): void {
    for (const brick of this.brickGrid.getActiveBricks()) this.drawBrick(brick);
  }

  private drawBrick(brick: BrickState): void {
    const g = this.gfx;
    let fillColor: number;
    let strokeColor = 0x000000, strokeAlpha = 0.5;

    switch (brick.type) {
      case 'normal':
        fillColor = NORMAL_BRICK_COLORS[brick.row % NORMAL_BRICK_COLORS.length]; break;
      case 'powerup':
        fillColor = POWERUP_BRICK_COLOR; strokeColor = 0x8888ff; strokeAlpha = 1.0; break;
      case 'reinforced': {
        const t = brick.maxHp > 1 ? (brick.hp - 1) / (brick.maxHp - 1) : 1;
        fillColor = lerpColor(0xccbbee, REINFORCED_BRICK_COLOR, t); break;
      }
      case 'solid': {
        const t = brick.maxHp > 1 ? (brick.hp - 1) / (brick.maxHp - 1) : 1;
        fillColor = lerpColor(0xaaccdd, SOLID_BRICK_COLOR, t); break;
      }
      case 'iron':
        fillColor = IRON_BRICK_COLOR; strokeColor = 0xaabbcc; strokeAlpha = 0.8; break;
      default:
        fillColor = 0x888888;
    }

    // Flash overlay
    const flashT = this.flashMap.get(brick);
    if (flashT !== undefined) fillColor = lerpColor(fillColor, 0xffffff, (flashT / FLASH_TIME) * 0.85);

    g.fillStyle(fillColor, 1);
    g.fillRect(brick.x, brick.y, BRICK_W, BRICK_H);
    g.lineStyle(1, strokeColor, strokeAlpha);
    g.strokeRect(brick.x, brick.y, BRICK_W, BRICK_H);

    // Power-up brick inner glow
    if (brick.type === 'powerup') {
      g.lineStyle(1, 0xaaaaff, 0.6);
      g.strokeRect(brick.x + 2, brick.y + 2, BRICK_W - 4, BRICK_H - 4);
    }

    // Iron hatch
    if (brick.type === 'iron') {
      g.lineStyle(1, 0x99aabb, 0.35);
      g.beginPath();
      g.moveTo(brick.x + 5,           brick.y);
      g.lineTo(brick.x,               brick.y + 5);
      g.moveTo(brick.x + BRICK_W,     brick.y + BRICK_H - 5);
      g.lineTo(brick.x + BRICK_W - 5, brick.y + BRICK_H);
      g.strokePath();
    }

    // HP dots (reinforced / solid)
    if ((brick.type === 'reinforced' || brick.type === 'solid') && brick.hp > 0) {
      const dotR = 2, gap = 6;
      const dotX0 = brick.x + BRICK_W - dotR - 3;
      const dotY  = brick.y + BRICK_H - dotR - 3;
      for (let i = 0; i < brick.hp; i++) {
        g.fillStyle(0xffffff, 0.75);
        g.fillCircle(dotX0 - i * gap, dotY, dotR);
      }
    }
  }

  private drawPaddle(): void {
    const { paddle, fireBall } = this;
    this.gfx.fillStyle(fireBall ? 0xff6622 : 0x4488ff, 1);
    this.gfx.fillRoundedRect(paddle.left, paddle.top, paddle.width, paddle.height, 5);
    this.gfx.lineStyle(1, 0xffffff, 0.4);
    this.gfx.strokeRoundedRect(paddle.left, paddle.top, paddle.width, paddle.height, 5);
  }

  private drawBalls(): void {
    for (const ball of this.balls) {
      if (this.fireBall) {
        this.gfx.fillStyle(0xff8800, 0.35);
        this.gfx.fillCircle(ball.x, ball.y, ball.radius * 2.4);
        this.gfx.fillStyle(0xff4400, 1);
      } else {
        this.gfx.fillStyle(0xffffff, 1);
      }
      this.gfx.fillCircle(ball.x, ball.y, ball.radius);
    }
  }

  private drawTrails(): void {
    for (const t of this.ballTrails) {
      this.gfx.fillStyle(0xff6600, t.alpha);
      this.gfx.fillCircle(t.x, t.y, BALL_RADIUS * 0.85);
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      this.gfx.fillStyle(p.color, p.alpha);
      this.gfx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  private drawPowerupDrops(): void {
    for (const drop of this.powerupDrops) {
      const color = POWERUP_COLORS[drop.type] ?? 0xffffff;
      const hw = POWERUP_W / 2, hh = POWERUP_H / 2;
      this.gfx.fillStyle(color, 0.9);
      this.gfx.fillRoundedRect(drop.x - hw, drop.y - hh, POWERUP_W, POWERUP_H, 4);
      this.gfx.lineStyle(1, 0xffffff, 0.5);
      this.gfx.strokeRoundedRect(drop.x - hw, drop.y - hh, POWERUP_W, POWERUP_H, 4);
    }
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8)  |
     Math.round(ab + (bb - ab) * t)
  );
}

function getBrickBaseColor(brick: BrickState): number {
  switch (brick.type) {
    case 'normal':     return NORMAL_BRICK_COLORS[brick.row % NORMAL_BRICK_COLORS.length];
    case 'powerup':    return 0x8888ff;
    case 'reinforced': return REINFORCED_BRICK_COLOR;
    case 'solid':      return SOLID_BRICK_COLOR;
    default:           return 0x778899;
  }
}
