import Phaser from 'phaser';
import {
  SCENE_KEYS, CANVAS_WIDTH,
  CELL_SIZE, GRID_COLS, GRID_ROWS, GRID_OFFSET_X, GRID_OFFSET_Y,
  COLORS, FONT_FAMILY, GameMode,
  getSnakeInterval, SCORE, ENHANCED,
} from '../constants/GameConstants';
import { Snake, Direction } from '../game/Snake';
import { FoodManager, FoodType } from '../game/FoodManager';
import { AudioManager } from '../game/AudioManager';
import { StorageUtil } from '../utils/StorageUtil';

const FOOD_POINTS: Record<FoodType, number> = {
  normal: SCORE.NORMAL_FOOD,
  speed:  SCORE.SPEED_FOOD,
  slow:   SCORE.SLOW_FOOD,
  score:  SCORE.SCORE_FOOD,
};

// Y coordinate where grid ends
const GRID_BOTTOM = GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE; // 620

export class GameScene extends Phaser.Scene {
  // ── Core game state ────────────────────────────────────────────────────────
  private mode: GameMode = 'classic';
  private snake!: Snake;
  private foodManager!: FoodManager;
  private score = 0;
  private isPaused   = false;
  private isGameOver = false;
  private tickAccum  = 0;

  // ── Enhanced-mode state ────────────────────────────────────────────────────
  private specialSpawnAccum = 0;
  private buff: { type: 'speed' | 'slow'; remaining: number } | null = null;

  // ── Audio ──────────────────────────────────────────────────────────────────
  private audioManager!: AudioManager;

  // ── Graphics ───────────────────────────────────────────────────────────────
  private bgGraphics!:   Phaser.GameObjects.Graphics;
  private gameGraphics!: Phaser.GameObjects.Graphics;

  // ── HUD (base) ─────────────────────────────────────────────────────────────
  private scoreText!:  Phaser.GameObjects.Text;
  private lengthText!: Phaser.GameObjects.Text;
  private bestText!:   Phaser.GameObjects.Text;

  // ── HUD (enhanced buff bar) ────────────────────────────────────────────────
  private buffLabel!:  Phaser.GameObjects.Text;
  private buffFill!:   Phaser.GameObjects.Rectangle;
  private buffBgBar!:  Phaser.GameObjects.Rectangle;

  // ── Input ──────────────────────────────────────────────────────────────────
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;
  private swipeStart: { x: number; y: number } | null = null;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  togglePause(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.scene.stop(SCENE_KEYS.PAUSE);
    } else {
      this.isPaused = true;
      this.scene.launch(SCENE_KEYS.PAUSE, { mode: this.mode });
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  create(data: { mode?: GameMode }): void {
    this.mode              = data?.mode ?? 'classic';
    this.score             = 0;
    this.isGameOver        = false;
    this.isPaused          = false;
    this.tickAccum         = 0;
    this.swipeStart        = null;
    this.specialSpawnAccum = 0;
    this.buff              = null;

    const startX = Math.floor(GRID_COLS / 2);
    const startY = Math.floor(GRID_ROWS / 2);
    this.snake        = new Snake(startX, startY);
    this.foodManager  = new FoodManager();
    this.audioManager = new AudioManager();
    this.spawnNormalFood();

    this.bgGraphics   = this.add.graphics().setDepth(0);
    this.gameGraphics = this.add.graphics().setDepth(1);

    this.drawBackground();
    this.createHUD();
    if (this.mode === 'enhanced') this.createEnhancedHUD();
    this.setupInput();
    this.drawGame();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.keyP)) { this.togglePause(); return; }
    if (this.isPaused) return;

    this.handleKeyDirection();

    if (this.mode === 'enhanced') this.updateEnhanced(delta);

    this.tickAccum += delta;
    const interval = this.getCurrentInterval();
    while (this.tickAccum >= interval) {
      this.tickAccum -= interval;
      this.tick();
      if (this.isGameOver) return;
    }

    this.drawGame();
  }

  // ── Game logic ─────────────────────────────────────────────────────────────

  private tick(): void {
    const nextHead = this.snake.peekNextHead();

    // Wall collision
    if (nextHead.x < 0 || nextHead.x >= GRID_COLS ||
        nextHead.y < 0 || nextHead.y >= GRID_ROWS) {
      this.triggerGameOver();
      return;
    }

    // Food check before self-collision (grow flag affects tail check)
    const food = this.foodManager.consume(nextHead.x, nextHead.y);
    // Score food gives points but doesn't grow the snake (PRD)
    const grow = food !== null && food.type !== 'score';

    // Self-collision: check against segments that will remain after move
    const bodyToCheck = grow
      ? this.snake.getCells()
      : this.snake.getCells().slice(0, -1);
    if (bodyToCheck.some(c => c.x === nextHead.x && c.y === nextHead.y)) {
      this.triggerGameOver();
      return;
    }

    this.snake.move(grow);

    if (food) {
      const points = FOOD_POINTS[food.type];
      this.score += points;

      // Audio feedback
      if (food.type === 'normal') {
        this.audioManager.playEat();
      } else {
        this.audioManager.playEatSpecial();
      }

      // Floating score popup
      this.showScorePopup(food.x, food.y, points, food.type);

      // Apply speed/slow buff
      if (food.type === 'speed' || food.type === 'slow') {
        this.buff = { type: food.type, remaining: ENHANCED.BUFF_DURATION };
        if (this.mode === 'enhanced') this.updateBuffHUD();
      }

      this.updateHUD();

      if (food.type === 'normal') {
        this.spawnNormalFood();
      }
    }
  }

  // ── Enhanced-mode update ───────────────────────────────────────────────────

  private updateEnhanced(delta: number): void {
    // Buff countdown
    if (this.buff) {
      this.buff.remaining -= delta;
      if (this.buff.remaining <= 0) {
        this.buff = null;
      }
      this.updateBuffHUD();
    }

    // Special food expiry
    this.foodManager.removeExpired(ENHANCED.SPECIAL_LIFETIME);

    // Special food spawn timer
    this.specialSpawnAccum += delta;
    if (this.specialSpawnAccum >= ENHANCED.SPECIAL_SPAWN_INTERVAL) {
      this.specialSpawnAccum = 0;
      if (this.foodManager.specialCount() < ENHANCED.MAX_SPECIAL_FOODS) {
        this.spawnSpecialFood();
      }
    }
  }

  private spawnSpecialFood(): void {
    const types: FoodType[] = ['speed', 'slow', 'score'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.foodManager.placeFood(type, (x, y) =>
      this.snake.getCells().some(c => c.x === x && c.y === y)
    );
  }

  /** Returns current tick interval in ms, accounting for active buff. */
  private getCurrentInterval(): number {
    const base = getSnakeInterval(this.score);
    if (!this.buff) return base;
    if (this.buff.type === 'speed') return Math.max(50,  Math.round(base / 1.5));
    if (this.buff.type === 'slow')  return Math.min(400, Math.round(base * 1.667));
    return base;
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.audioManager.playGameOver();
    const isNewRecord = this.score > StorageUtil.getBest(this.mode);
    StorageUtil.saveBest(this.mode, this.score);
    this.drawGame();

    this.time.delayedCall(700, () => {
      this.scene.launch(SCENE_KEYS.GAME_OVER, {
        score:       this.score,
        length:      this.snake.length,
        mode:        this.mode,
        best:        StorageUtil.getBest(this.mode),
        isNewRecord,
      });
    });
  }

  private spawnNormalFood(): void {
    this.foodManager.placeFood('normal', (x, y) =>
      this.snake.getCells().some(c => c.x === x && c.y === y)
    );
  }

  /** Floating "+N" text that rises from the food cell and fades out. */
  private showScorePopup(gridX: number, gridY: number, points: number, type: FoodType): void {
    const px = GRID_OFFSET_X + gridX * CELL_SIZE + CELL_SIZE / 2;
    const py = GRID_OFFSET_Y + gridY * CELL_SIZE;

    const colorMap: Record<FoodType, string> = {
      normal: '#ffffff',
      speed:  '#ffdd00',
      slow:   '#44ccff',
      score:  '#ffaa00',
    };
    const size = type === 'score' ? '16px' : '14px';

    const txt = this.add.text(px, py, `+${points}`, {
      fontSize: size, color: colorMap[type], fontFamily: FONT_FAMILY,
      stroke: '#003300', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(10);

    this.tweens.add({
      targets:  txt,
      y:        py - 44,
      alpha:    0,
      duration: 750,
      ease:     'Cubic.Out',
      onComplete: () => txt.destroy(),
    });
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyP    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.swipeStart = { x: ptr.x, y: ptr.y };
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (!this.swipeStart || this.isPaused || this.isGameOver) {
        this.swipeStart = null;
        return;
      }
      const dx = ptr.x - this.swipeStart.x;
      const dy = ptr.y - this.swipeStart.y;
      this.swipeStart = null;

      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

      let dir: Direction;
      if (Math.abs(dx) >= Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      this.snake.setDirection(dir);
    });
  }

  private handleKeyDirection(): void {
    const JD = Phaser.Input.Keyboard.JustDown;
    if      (JD(this.cursors.up!)    || JD(this.keyW)) this.snake.setDirection('up');
    else if (JD(this.cursors.down!)  || JD(this.keyS)) this.snake.setDirection('down');
    else if (JD(this.cursors.left!)  || JD(this.keyA)) this.snake.setDirection('left');
    else if (JD(this.cursors.right!) || JD(this.keyD)) this.snake.setDirection('right');
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const cx = CANVAS_WIDTH / 2;
    const modeLabel = this.mode === 'classic' ? '经典' : '增强';

    this.add.text(GRID_OFFSET_X, 8, `贪吃的小龙 · ${modeLabel}`, {
      fontSize: '18px', color: '#44ff44', fontFamily: FONT_FAMILY,
    });

    const pauseBtn = this.add.text(CANVAS_WIDTH - GRID_OFFSET_X, 8, '[P] 暂停', {
      fontSize: '16px', color: '#446644', fontFamily: FONT_FAMILY,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerover', () => pauseBtn.setColor('#88bb88'));
    pauseBtn.on('pointerout',  () => pauseBtn.setColor('#446644'));
    pauseBtn.on('pointerdown', () => this.togglePause());

    this.add.text(GRID_OFFSET_X, 34, 'SCORE', {
      fontSize: '11px', color: '#336633', fontFamily: FONT_FAMILY,
    });
    this.scoreText = this.add.text(GRID_OFFSET_X, 46, '0', {
      fontSize: '14px', color: '#ffffff', fontFamily: FONT_FAMILY,
    });

    this.add.text(cx - 30, 34, 'LENGTH', {
      fontSize: '11px', color: '#336633', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);
    this.lengthText = this.add.text(cx - 30, 46, '3', {
      fontSize: '14px', color: '#aaffaa', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);

    this.add.text(CANVAS_WIDTH - GRID_OFFSET_X, 34, 'BEST', {
      fontSize: '11px', color: '#336633', fontFamily: FONT_FAMILY,
    }).setOrigin(1, 0);
    this.bestText = this.add.text(CANVAS_WIDTH - GRID_OFFSET_X, 46,
      String(StorageUtil.getBest(this.mode)), {
        fontSize: '14px', color: '#ffdd44', fontFamily: FONT_FAMILY,
      }).setOrigin(1, 0);

    this.add.graphics()
      .lineStyle(1, 0x1a3a1a, 1)
      .lineBetween(0, GRID_OFFSET_Y - 2, CANVAS_WIDTH, GRID_OFFSET_Y - 2);
  }

  /** Food legend + buff bar shown below the grid in enhanced mode. */
  private createEnhancedHUD(): void {
    const SEP_Y = GRID_BOTTOM + 2;
    const LY1   = GRID_BOTTOM + 14;  // legend row 1
    const LY2   = LY1 + 22;          // legend row 2
    const BUFF_Y = LY2 + 28;         // buff bar row
    const BAR_W  = 200;
    const OX     = GRID_OFFSET_X;

    // Separator line
    this.add.graphics()
      .lineStyle(1, 0x1a3a1a, 1)
      .lineBetween(0, SEP_Y, CANVAS_WIDTH, SEP_Y);

    // Food legend: 2×2 grid of colour swatch + label
    const legends: [number, string, number, number][] = [
      [COLORS.FOOD_NORMAL, '● 普通食物 +10', OX,       LY1],
      [COLORS.FOOD_SPEED,  '▲ 加速食物 +5',  OX + 220, LY1],
      [COLORS.FOOD_SLOW,   '▼ 减速食物 +5',  OX,       LY2],
      [COLORS.FOOD_SCORE,  '◆ 加分食物 +50', OX + 220, LY2],
    ];

    for (const [color, label, lx, ly] of legends) {
      const hex = '#' + color.toString(16).padStart(6, '0');
      this.add.text(lx, ly, label, {
        fontSize: '12px', color: hex, fontFamily: FONT_FAMILY,
      });
    }

    // Buff label
    this.buffLabel = this.add.text(OX, BUFF_Y, '', {
      fontSize: '13px', color: '#446644', fontFamily: FONT_FAMILY,
    }).setOrigin(0, 0.5);

    // Buff progress bar (background)
    const barX = CANVAS_WIDTH - GRID_OFFSET_X - BAR_W / 2;
    this.buffBgBar = this.add.rectangle(barX, BUFF_Y, BAR_W, 12, 0x113311)
      .setVisible(false);

    // Buff progress bar (fill, left-anchored)
    this.buffFill = this.add.rectangle(
      barX - BAR_W / 2, BUFF_Y, 0, 10, 0x44ff44
    ).setOrigin(0, 0.5).setVisible(false);
  }

  private updateHUD(): void {
    this.scoreText.setText(String(this.score));
    this.lengthText.setText(String(this.snake.length));
    this.bestText.setText(String(Math.max(this.score, StorageUtil.getBest(this.mode))));
  }

  private updateBuffHUD(): void {
    if (!this.buff) {
      this.buffLabel.setText('');
      this.buffBgBar.setVisible(false);
      this.buffFill.setVisible(false);
      return;
    }

    const { type, remaining } = this.buff;
    const pct = Math.max(0, remaining / ENHANCED.BUFF_DURATION);
    const secs = (remaining / 1000).toFixed(1);

    if (type === 'speed') {
      this.buffLabel.setText(`⚡ 加速中 ${secs}s`).setColor('#ffdd00');
      this.buffFill.setFillStyle(0xffdd00);
    } else {
      this.buffLabel.setText(`❄ 减速中 ${secs}s`).setColor('#44aaff');
      this.buffFill.setFillStyle(0x44aaff);
    }

    const BAR_W = 200;
    this.buffBgBar.setVisible(true);
    this.buffFill.setVisible(true);
    this.buffFill.setSize(BAR_W * pct, 10);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g  = this.bgGraphics;
    const ox = GRID_OFFSET_X;
    const oy = GRID_OFFSET_Y;
    const w  = GRID_COLS * CELL_SIZE;
    const h  = GRID_ROWS * CELL_SIZE;

    g.fillStyle(COLORS.GRID_BG, 1);
    g.fillRect(ox, oy, w, h);

    g.lineStyle(1, COLORS.GRID_LINE, 0.8);
    for (let col = 0; col <= GRID_COLS; col++) {
      g.lineBetween(ox + col * CELL_SIZE, oy, ox + col * CELL_SIZE, oy + h);
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      g.lineBetween(ox, oy + row * CELL_SIZE, ox + w, oy + row * CELL_SIZE);
    }

    g.lineStyle(2, 0x224422, 1);
    g.strokeRect(ox, oy, w, h);
  }

  private drawGame(): void {
    const g  = this.gameGraphics;
    const ox = GRID_OFFSET_X;
    const oy = GRID_OFFSET_Y;
    const cs = CELL_SIZE;
    g.clear();

    // ── Food ────────────────────────────────────────────────────────────────
    for (const food of this.foodManager.items) {
      const fcx = ox + food.x * cs + cs / 2;
      const fcy = oy + food.y * cs + cs / 2;
      const r   = cs / 2 - 1;

      switch (food.type) {
        case 'normal':
          // Red circle
          g.fillStyle(COLORS.FOOD_NORMAL, 1);
          g.fillCircle(fcx, fcy, r);
          g.fillStyle(0xffffff, 0.3);
          g.fillCircle(fcx - 3, fcy - 3, 3);
          break;

        case 'speed':
          // Yellow upward triangle
          g.fillStyle(COLORS.FOOD_SPEED, 1);
          g.fillTriangle(
            fcx,     fcy - r,
            fcx - r, fcy + r,
            fcx + r, fcy + r,
          );
          g.fillStyle(0xffffff, 0.25);
          g.fillTriangle(fcx, fcy - r, fcx - r * 0.5, fcy, fcx + r * 0.5, fcy);
          break;

        case 'slow':
          // Blue downward triangle
          g.fillStyle(COLORS.FOOD_SLOW, 1);
          g.fillTriangle(
            fcx,     fcy + r,
            fcx - r, fcy - r,
            fcx + r, fcy - r,
          );
          g.fillStyle(0xffffff, 0.25);
          g.fillTriangle(fcx - r * 0.5, fcy - r, fcx + r * 0.5, fcy - r, fcx, fcy);
          break;

        case 'score':
          // Gold diamond
          g.fillStyle(COLORS.FOOD_SCORE, 1);
          g.beginPath();
          g.moveTo(fcx,     fcy - r);
          g.lineTo(fcx + r, fcy    );
          g.lineTo(fcx,     fcy + r);
          g.lineTo(fcx - r, fcy    );
          g.closePath();
          g.fillPath();
          g.fillStyle(0xffffff, 0.3);
          g.fillCircle(fcx - 2, fcy - 3, 2);
          break;
      }
    }

    // ── Snake ────────────────────────────────────────────────────────────────
    const cells = this.snake.getCells();
    const alpha = this.isGameOver ? 0.4 : 1;

    // Tint head colour based on active buff
    let headColor: number = COLORS.SNAKE_HEAD;
    if (this.buff?.type === 'speed') headColor = 0xffee44;
    if (this.buff?.type === 'slow')  headColor = 0x44ccff;

    for (let i = 0; i < cells.length; i++) {
      const { x, y } = cells[i];
      const px   = ox + x * cs + 1;
      const py   = oy + y * cs + 1;
      const size = cs - 2;
      const isHead = i === 0;

      g.fillStyle(isHead ? headColor : COLORS.SNAKE_BODY, alpha);
      g.fillRoundedRect(px, py, size, size, isHead ? 5 : 2);

      if (isHead && !this.isGameOver) {
        g.fillStyle(0x003300, 1);
        g.fillCircle(px + size * 0.3, py + size * 0.3, 2);
        g.fillCircle(px + size * 0.7, py + size * 0.3, 2);
      } else if (!isHead) {
        g.fillStyle(0xffffff, 0.12);
        g.fillRect(px + 1, py + 1, size - 2, 3);
      }
    }

    // ── Game Over overlay ────────────────────────────────────────────────────
    if (this.isGameOver) {
      g.fillStyle(0x000000, 0.45);
      g.fillRect(ox, oy, GRID_COLS * cs, GRID_ROWS * cs);
    }
  }
}
