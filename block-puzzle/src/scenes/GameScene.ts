import {
  SCENE_KEYS,
  GRID_COLS, GRID_ROWS, CELL_SIZE,
  GRID_OFFSET_X, GRID_OFFSET_Y,
  COLORS,
  CANVAS_WIDTH,
} from '../constants/GameConstants';
import { Grid } from '../game/Grid';
import { ScoreManager } from '../game/ScoreManager';
import { Tetromino, TetrominoBag, TetrominoType, ActivePiece } from '../game/Tetromino';
import { AnimationManager } from '../game/AnimationManager';
import { AudioManager } from '../game/AudioManager';
import { InfoPanel } from '../ui/InfoPanel';
import { TouchControls } from '../ui/TouchControls';
import { InputManager } from '../input/InputManager';
import { StorageUtil } from '../utils/StorageUtil';
import { SettingsManager } from '../utils/SettingsManager';
import { FONT_FAMILY } from '../constants/GameConstants';
import Phaser from 'phaser';

const SPAWN_X = 3;
const SPAWN_Y = -1;

export class GameScene extends Phaser.Scene {
  // 游戏逻辑
  private grid!: Grid;
  private scoreManager!: ScoreManager;
  private bag!: TetrominoBag;
  private currentPiece!: ActivePiece;
  private nextType!: TetrominoType;

  // 渲染
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private pieceGraphics!: Phaser.GameObjects.Graphics;
  private infoPanel!: InfoPanel;

  // 动画 & 音频
  private animManager!: AnimationManager;
  private audioManager!: AudioManager;

  // 输入
  private inputManager!: InputManager;
  private touchControls!: TouchControls;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;

  // 计时
  private dropAccum: number = 0;

  // 状态
  private isGameOver: boolean = false;
  private isPaused: boolean = false;
  private isLocking: boolean = false;
  private isConfirmingRestart: boolean = false;
  private isHardMode: boolean = false;

  // 重开确认 overlay
  private restartOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.isGameOver = false;
    this.isPaused   = false;
    this.isLocking  = false;
    this.dropAccum  = 0;
    this.isHardMode = SettingsManager.get().difficulty === 'hard';

    // 逻辑层
    this.grid         = new Grid();
    this.scoreManager = new ScoreManager();
    this.bag          = new TetrominoBag();

    // 渲染层（深度从低到高：bg → board → piece → animation overlays）
    this.bgGraphics    = this.add.graphics().setDepth(0);
    this.boardGraphics = this.add.graphics().setDepth(1);
    this.pieceGraphics = this.add.graphics().setDepth(2);

    // 动画 & 音频
    this.animManager  = new AnimationManager(this);
    this.audioManager = new AudioManager();

    // UI
    this.infoPanel = new InfoPanel(this);
    this.createTopBar();

    // 输入
    // P / R 键单独处理，需在 isPaused 时也能响应
    this.pauseKey   = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.inputManager = new InputManager(this);
    this.inputManager.onMoveLeft   = () => { if (this.tryMove(-1, 0)) this.audioManager.playMove(); };
    this.inputManager.onMoveRight  = () => { if (this.tryMove(1, 0))  this.audioManager.playMove(); };
    this.inputManager.onSoftDrop   = () => this.tryMoveDown();
    this.inputManager.onHardDrop   = () => this.hardDrop();
    this.inputManager.onRotateCW   = () => { if (this.tryRotate(1))  this.audioManager.playRotate(); };
    this.inputManager.onRotateCCW  = () => { if (this.tryRotate(-1)) this.audioManager.playRotate(); };

    this.touchControls = new TouchControls(this, {
      onMoveLeft:  () => { if (this.tryMove(-1, 0)) this.audioManager.playMove(); },
      onMoveRight: () => { if (this.tryMove(1, 0))  this.audioManager.playMove(); },
      onSoftDrop:  () => this.tryMoveDown(),
      onHardDrop:  () => this.hardDrop(),
      onRotateCW:  () => { if (this.tryRotate(1))  this.audioManager.playRotate(); },
      onRotateCCW: () => { if (this.tryRotate(-1)) this.audioManager.playRotate(); },
    });

    // 静态背景
    this.drawBackground();

    // BGM（场景关闭/重开时自动停止，避免重叠）
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audioManager.stopBGM();
    });
    this.audioManager.startBGM();

    // 生成第一块
    this.nextType = this.bag.next();
    this.spawnNext();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const JD = Phaser.Input.Keyboard.JustDown;

    // P / R 在暂停和确认重开状态下也需要响应
    if (JD(this.pauseKey))   { this.togglePause(); return; }
    if (JD(this.restartKey)) { this.handleRestartKey(); return; }

    if (this.isPaused || this.isLocking) return;

    this.inputManager.update(delta);
    this.touchControls.update(delta);

    // 自动下落
    this.dropAccum += delta;
    if (this.dropAccum >= this.scoreManager.getDropInterval()) {
      this.dropAccum = 0;
      this.tryMoveDown();
    }

    this.drawPieces();
  }

  // ─── 移动与旋转 ───────────────────────────────────────────────────────────────

  private tryMove(dx: number, dy: number): boolean {
    if (this.isLocking) return false;
    const moved: ActivePiece = {
      ...this.currentPiece,
      gridX: this.currentPiece.gridX + dx,
      gridY: this.currentPiece.gridY + dy,
    };
    if (this.grid.isValidPosition(moved)) {
      this.currentPiece = moved;
      return true;
    }
    return false;
  }

  private tryMoveDown(): void {
    if (!this.tryMove(0, 1)) {
      this.onPieceLand();
    }
  }

  /** 返回是否旋转成功 */
  private tryRotate(direction: 1 | -1): boolean {
    if (this.isLocking) return false;
    const rotated = Tetromino.tryRotate(
      this.currentPiece,
      direction,
      (p) => this.grid.isValidPosition(p)
    );
    if (rotated) {
      this.currentPiece = rotated;
      return true;
    }
    return false;
  }

  private hardDrop(): void {
    if (this.isLocking) return;
    const ghostY = this.grid.getGhostY(this.currentPiece);
    this.currentPiece = { ...this.currentPiece, gridY: ghostY };
    this.audioManager.playHardDrop();
    this.onPieceLand();
  }

  // ─── 方块落地流程（带动画）────────────────────────────────────────────────────

  private onPieceLand(): void {
    this.isLocking = true;

    // 1. 写入网格
    this.grid.writePiece(this.currentPiece);

    // 2. 落地高光
    this.animManager.playLockFlash(this.currentPiece);

    // 3. 重绘已锁定方块
    this.drawBoard();

    // 4. 检测满行
    const fullRows = this.grid.getFullRowIndices();

    if (fullRows.length > 0) {
      // 有行消除：播放动画后再清行
      if (fullRows.length === 4) {
        this.animManager.playTetrisEffect(fullRows);
      }

      this.animManager.playLineClearAnimation(fullRows, () => {
        const cleared  = this.grid.clearLines();
        const levelUp  = this.scoreManager.addLines(cleared);
        this.audioManager.playClear(cleared);
        this.updateInfoPanel();
        this.drawBoard();
        this.isLocking = false;
        if (levelUp) this.showLevelUp();
        this.spawnNext();
      });
    } else {
      // 无消除：直接生成下一块
      this.isLocking = false;
      this.spawnNext();
    }
  }

  private spawnNext(): void {
    const type = this.nextType;
    this.nextType = this.bag.next();

    this.currentPiece = {
      type,
      rotationIndex: 0,
      gridX: SPAWN_X,
      gridY: SPAWN_Y,
    };

    this.infoPanel.updateNextPiece(this.nextType);
    this.dropAccum = 0;

    if (this.grid.isGameOver(this.currentPiece)) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    StorageUtil.saveHighScore(this.scoreManager.getScore());
    this.infoPanel.refreshBest();
    this.audioManager.playGameOver();
    this.scene.launch(SCENE_KEYS.GAME_OVER, { score: this.scoreManager.getScore() });
  }

  // public：SettingsScene 更改设置后立即生效
  applySettings(): void {
    this.audioManager.applySettings();
    this.isHardMode = SettingsManager.get().difficulty === 'hard';
  }

  // public：PauseScene 的继续按钮需要调用
  togglePause(): void {
    if (this.isConfirmingRestart) return;
    if (this.isPaused) {
      // 继续游戏
      this.isPaused = false;
      this.scene.stop(SCENE_KEYS.PAUSE);
    } else {
      // 暂停游戏（不调用 scene.pause，让 update 中 isPaused 判断控制）
      this.isPaused = true;
      this.scene.launch(SCENE_KEYS.PAUSE);
    }
  }

  // ─── 重开确认 ─────────────────────────────────────────────────────────────────

  private handleRestartKey(): void {
    if (this.isConfirmingRestart) {
      // 第二次按 R → 确认重开
      this.scene.restart();
    } else {
      this.requestRestart();
    }
  }

  private requestRestart(): void {
    if (this.isPaused) this.scene.stop(SCENE_KEYS.PAUSE);
    this.isPaused = true;
    this.isConfirmingRestart = true;
    this.showRestartConfirm();
  }

  private showRestartConfirm(): void {
    const cx = CANVAS_WIDTH / 2;
    const cy = 320;
    const pad = { top: 6, bottom: 2 };

    const bg = this.add.rectangle(cx, cy, 300, 150, 0x000000, 0.92)
      .setStrokeStyle(1, 0x4444aa);

    const title = this.add.text(cx, cy - 38, '确认重新开始？', {
      fontSize: '20px', color: '#ffffff', padding: pad, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const hint = this.add.text(cx, cy - 4, '当前进度将全部丢失', {
      fontSize: '14px', color: '#ff8888', padding: pad, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const sub = this.add.text(cx, cy + 22, '再按 R 确认 / 按 P 取消', {
      fontSize: '13px', color: '#888899', padding: pad, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const confirmBtn = this.add.text(cx - 62, cy + 54, '[ 确认重开 ]', {
      fontSize: '16px', color: '#ff4444', padding: pad, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const cancelBtn = this.add.text(cx + 62, cy + 54, '[ 取消 ]', {
      fontSize: '16px', color: '#00f0f0', padding: pad, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerdown', () => this.scene.restart());
    cancelBtn.on('pointerdown', () => this.cancelRestartConfirm());

    this.restartOverlay = this.add.container(0, 0,
      [bg, title, hint, sub, confirmBtn, cancelBtn]
    ).setDepth(30);
  }

  private cancelRestartConfirm(): void {
    this.isConfirmingRestart = false;
    this.isPaused = false;
    this.restartOverlay?.destroy();
    this.restartOverlay = undefined;
  }

  private updateInfoPanel(): void {
    this.infoPanel.updateScore(this.scoreManager.getScore());
    this.infoPanel.updateLevel(this.scoreManager.getLevel());
    this.infoPanel.updateLines(this.scoreManager.getLinesCleared());
  }

  // ─── 渲染 ─────────────────────────────────────────────────────────────────────

  private drawBackground(): void {
    const g  = this.bgGraphics;
    const w  = GRID_COLS * CELL_SIZE;
    const h  = GRID_ROWS * CELL_SIZE;
    const ox = GRID_OFFSET_X;
    const oy = GRID_OFFSET_Y;

    g.fillStyle(COLORS.GRID_BG, 1);
    g.fillRect(ox, oy, w, h);

    g.lineStyle(1, COLORS.GRID_LINE, 1);
    for (let col = 0; col <= GRID_COLS; col++) {
      g.lineBetween(ox + col * CELL_SIZE, oy, ox + col * CELL_SIZE, oy + h);
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      g.lineBetween(ox, oy + row * CELL_SIZE, ox + w, oy + row * CELL_SIZE);
    }

    g.lineStyle(2, 0x4444aa, 1);
    g.strokeRect(ox, oy, w, h);
  }

  private drawBoard(): void {
    const g     = this.boardGraphics;
    const state = this.grid.getState();
    g.clear();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const color = state[row][col];
        if (color !== 0) this.drawCell(g, col, row, color, 1);
      }
    }
  }

  private drawPieces(): void {
    const g = this.pieceGraphics;
    g.clear();

    // Ghost（困难模式下隐藏）
    const ghostY = this.grid.getGhostY(this.currentPiece);
    if (!this.isHardMode && ghostY !== this.currentPiece.gridY) {
      const ghost = { ...this.currentPiece, gridY: ghostY };
      g.fillStyle(COLORS.GHOST, 1);
      for (const { x, y } of Tetromino.getCells(ghost)) {
        if (y >= 0) {
          const px = GRID_OFFSET_X + x * CELL_SIZE + 1;
          const py = GRID_OFFSET_Y + y * CELL_SIZE + 1;
          g.fillRect(px, py, CELL_SIZE - 2, CELL_SIZE - 2);
          g.lineStyle(1, 0x8888cc, 0.5);
          g.strokeRect(px, py, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    // 活动方块
    const color = Tetromino.getColor(this.currentPiece.type);
    for (const { x, y } of Tetromino.getCells(this.currentPiece)) {
      if (y >= 0) this.drawCell(g, x, y, color, 1);
    }
  }

  private drawCell(
    g: Phaser.GameObjects.Graphics,
    gridX: number, gridY: number,
    color: number, alpha: number
  ): void {
    const px   = GRID_OFFSET_X + gridX * CELL_SIZE + 1;
    const py   = GRID_OFFSET_Y + gridY * CELL_SIZE + 1;
    const size = CELL_SIZE - 2;

    g.fillStyle(color, alpha);
    g.fillRect(px, py, size, size);

    g.fillStyle(0xffffff, 0.2);
    g.fillRect(px, py, size, 4);

    g.fillStyle(0xffffff, 0.1);
    g.fillRect(px, py, 4, size);

    g.fillStyle(0x000000, 0.2);
    g.fillRect(px + size - 4, py, 4, size);
    g.fillRect(px, py + size - 4, size, 4);
  }

  // ─── 升级动画 ─────────────────────────────────────────────────────────────────

  private showLevelUp(): void {
    const cx = GRID_OFFSET_X + (GRID_COLS * CELL_SIZE) / 2;
    const cy = GRID_OFFSET_Y + (GRID_ROWS * CELL_SIZE) / 2;

    const txt = this.add.text(cx, cy, 'LEVEL UP!', {
      fontSize: '32px', color: '#ffdd00', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
      padding: { top: 6, bottom: 4 }, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    this.tweens.add({
      targets: txt,
      alpha:   { from: 0, to: 1 },
      scaleX:  { from: 0.4, to: 1 },
      scaleY:  { from: 0.4, to: 1 },
      y:       { from: cy + 20, to: cy - 20 },
      duration: 350,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets:  txt,
          alpha:    0,
          y:        cy - 60,
          duration: 700,
          delay:    300,
          ease:     'Cubic.In',
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  // ─── 顶部操作栏 ───────────────────────────────────────────────────────────────

  private createTopBar(): void {
    const textStyle = {
      padding: { top: 6, bottom: 2, left: 0, right: 0 },
      fontFamily: FONT_FAMILY,
    };

    this.add.text(GRID_OFFSET_X, 8, 'TETRIS', {
      fontSize: '28px', color: '#00f0f0', fontStyle: 'bold',
      ...textStyle,
    });

    const pauseBtn = this.add.text(CANVAS_WIDTH - 12, 28, '[P] 暂停', {
      fontSize: '16px', color: '#aaaaaa',
      ...textStyle,
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerover', () => pauseBtn.setColor('#ffffff'));
    pauseBtn.on('pointerout',  () => pauseBtn.setColor('#aaaaaa'));
    pauseBtn.on('pointerdown', () => this.togglePause());

    const restartBtn = this.add.text(CANVAS_WIDTH - 100, 28, '[R] 重开', {
      fontSize: '16px', color: '#aaaaaa',
      ...textStyle,
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setColor('#ffffff'));
    restartBtn.on('pointerout',  () => restartBtn.setColor('#aaaaaa'));
    restartBtn.on('pointerdown', () => this.requestRestart());

    this.add.graphics().lineStyle(1, 0x333355, 1)
      .lineBetween(0, 55, CANVAS_WIDTH, 55);
  }
}
