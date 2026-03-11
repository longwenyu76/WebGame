import Phaser from 'phaser';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, FONT_FAMILY, TILE_FONT_FAMILY,
  GRID_SIZE, TILE_SIZE, TILE_GAP, GRID_X, GRID_Y, BOARD_SIZE,
  TILE_BG_COLORS, TILE_BG_OVER, TILE_BG_EMPTY,
  TILE_TEXT_DARK, TILE_TEXT_LIGHT,
  BOARD_BG_COLOR, CANVAS_BG,
  ANIM_MOVE_MS, ANIM_SPAWN_MS, ANIM_MERGE_MS,
  SCENE_KEYS,
} from '../constants/GameConstants';
import { Grid, Direction, MoveResult, GridSnapshot } from '../game/Grid';
import { AudioManager } from '../game/AudioManager';
import { StorageUtil } from '../utils/StorageUtil';

// ── Tile display object ────────────────────────────────────────────────────────
interface TileObj {
  container: Phaser.GameObjects.Container;
  gfx:       Phaser.GameObjects.Graphics;
  text:      Phaser.GameObjects.Text;
  value:     number;
}

// ── GameScene ─────────────────────────────────────────────────────────────────
export class GameScene extends Phaser.Scene {
  // ── Game state ──────────────────────────────────────────────────────────────
  private grid!:      Grid;
  private score       = 0;
  private best        = 0;
  private won         = false;      // already shown win popup
  private gameOver    = false;
  private isAnimating = false;      // input lock during animations

  // ── Undo state ──────────────────────────────────────────────────────────────
  private undoSnapshot: GridSnapshot | null = null;
  private undoScore    = 0;
  private undoWon      = false;

  // ── Display objects ─────────────────────────────────────────────────────────
  private tileObjs    = new Map<number, TileObj>();   // id → display
  private gfxBoard!:  Phaser.GameObjects.Graphics;
  private txtScore!:  Phaser.GameObjects.Text;
  private txtBest!:   Phaser.GameObjects.Text;
  private overlay:    Phaser.GameObjects.Container | null = null;
  private undoBtnBg!: Phaser.GameObjects.Rectangle;
  private undoBtnTxt!: Phaser.GameObjects.Text;

  // ── Audio ───────────────────────────────────────────────────────────────────
  private audio!: AudioManager;

  // ── Input ───────────────────────────────────────────────────────────────────
  private cursors!:  Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyU!: Phaser.Input.Keyboard.Key;
  private swipeStart: { x: number; y: number } | null = null;

  constructor() { super({ key: SCENE_KEYS.GAME }); }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  create(): void {
    this.audio = new AudioManager();
    this.best  = StorageUtil.getHighScore();

    this.drawBackground();
    this.createHUD();
    this.createButtons();
    this.setupInput();

    // Try to restore saved game, otherwise start fresh
    const saved = StorageUtil.getCurrentGame();
    if (saved) {
      this.restoreSavedGame(saved);
    } else {
      this.startNewGame();
    }
  }

  // ── Background & HUD ─────────────────────────────────────────────────────────

  private drawBackground(): void {
    // Canvas bg
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_BG);

    // Board bg (rounded via graphics)
    this.gfxBoard = this.add.graphics();
    this.gfxBoard.fillStyle(BOARD_BG_COLOR, 1);
    this.gfxBoard.fillRoundedRect(GRID_X, GRID_Y, BOARD_SIZE, BOARD_SIZE, 8);
  }

  private createHUD(): void {
    const cx = CANVAS_WIDTH / 2;

    // Title
    this.add.text(16, 12, '2048 挑战', {
      fontSize: '38px', color: '#776e65', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    });
    this.add.text(16, 58, '2048 Challenge', {
      fontSize: '16px', color: '#bbada0', fontFamily: FONT_FAMILY,
    });

    // Score box
    this.add.rectangle(cx + 80, 32, 110, 52, 0xbbada0, 1).setOrigin(0.5);
    this.add.text(cx + 80, 14, '分数', {
      fontSize: '14px', color: '#eee4da', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);
    this.txtScore = this.add.text(cx + 80, 34, '0', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);

    // Best box
    this.add.rectangle(cx + 200, 32, 110, 52, 0xbbada0, 1).setOrigin(0.5);
    this.add.text(cx + 200, 14, '最高', {
      fontSize: '14px', color: '#eee4da', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);
    this.txtBest = this.add.text(cx + 200, 34, String(this.best), {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 0);
  }

  private createButtons(): void {
    const btY = GRID_Y + BOARD_SIZE + 28;

    // New Game
    this.makeButton(CANVAS_WIDTH / 2 - 90, btY, '新 游 戏', 0x8f7a66, () => {
      if (this.isAnimating) return;
      this.clearOverlay();
      this.startNewGame();
    });

    // Undo
    const undoBtn = this.makeButton(CANVAS_WIDTH / 2 + 90, btY, '  撤 销  ', 0x8f7a66, () => {
      if (this.isAnimating || this.gameOver) return;
      this.doUndo();
    });
    this.undoBtnBg  = undoBtn.bg;
    this.undoBtnTxt = undoBtn.txt;
    this.setUndoEnabled(false);  // disabled until first move

    // Save & return to platform
    this.makeButton(CANVAS_WIDTH / 2, btY + 66, '保存并退出', 0x776e65, () => {
      this.autoSave();
      this.showSaveAndExit();
    });

    // Copyright
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14, '灵感来自 Gabriele Cirulli 的 2048 · Built with Phaser 3', {
      fontSize: '11px', color: '#bbada0', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 1);
  }

  private makeButton(
    x: number, y: number, label: string, color: number,
    onClick: () => void,
  ): { bg: Phaser.GameObjects.Rectangle; txt: Phaser.GameObjects.Text } {
    const bg = this.add.rectangle(x, y, 150, 50, color, 1)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '20px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const over = () => { bg.setFillStyle(0xa0856e); };
    const out  = () => { bg.setFillStyle(color);    };
    bg.on('pointerover', over).on('pointerout', out).on('pointerdown', onClick);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerover', over).on('pointerout', out).on('pointerdown', onClick);
    return { bg, txt };
  }

  private setUndoEnabled(enabled: boolean): void {
    this.undoBtnBg.setFillStyle(enabled ? 0x8f7a66 : 0xbbada0);
    this.undoBtnTxt.setAlpha(enabled ? 1 : 0.5);
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyR = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyU = kb.addKey(Phaser.Input.Keyboard.KeyCodes.U);

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.swipeStart = { x: ptr.x, y: ptr.y };
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = ptr.x - this.swipeStart.x;
      const dy = ptr.y - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.tryMove(dx > 0 ? 'right' : 'left');
      } else {
        this.tryMove(dy > 0 ? 'down' : 'up');
      }
    });
  }

  update(): void {
    if (this.isAnimating || this.gameOver) return;

    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.keyR)) { this.clearOverlay(); this.startNewGame(); return; }
    if (JD(this.keyU)) { this.doUndo(); return; }

    if (JD(this.cursors.left!)  || JD(this.keyA)) this.tryMove('left');
    else if (JD(this.cursors.right!) || JD(this.keyD)) this.tryMove('right');
    else if (JD(this.cursors.up!)    || JD(this.keyW)) this.tryMove('up');
    else if (JD(this.cursors.down!)  || JD(this.keyS)) this.tryMove('down');
  }

  // ── Game logic ────────────────────────────────────────────────────────────────

  private startNewGame(): void {
    StorageUtil.clearCurrentGame();
    this.score    = 0;
    this.won      = false;
    this.gameOver = false;
    this.undoSnapshot = null;

    this.grid = new Grid();
    this.setUndoEnabled(false);

    // Destroy all existing tile displays
    this.tileObjs.forEach(t => t.container.destroy());
    this.tileObjs.clear();

    // Draw empty grid cells
    this.drawEmptyCells();

    // Spawn 2 initial tiles
    const t1 = this.grid.addRandom()!;
    const t2 = this.grid.addRandom()!;
    this.spawnTileObj(t1.row, t1.col, t1.value, t1.id, false);
    this.spawnTileObj(t2.row, t2.col, t2.value, t2.id, false);

    this.updateHUD();
    this.autoSave();
  }

  private restoreSavedGame(saved: ReturnType<typeof StorageUtil.getCurrentGame>): void {
    if (!saved) { this.startNewGame(); return; }

    this.score    = saved.score;
    this.won      = saved.won;
    this.gameOver = false;
    this.setUndoEnabled(false);

    // Rebuild grid from saved data
    const snapshot: GridSnapshot = {
      cells: saved.cells.map((row, r) =>
        row.map((val, c) => {
          const id = saved.ids[r][c];
          return (val !== null && id !== null) ? { value: val, id } : null;
        })
      ),
      nextId: saved.nextId,
    };
    this.grid = new Grid(snapshot);

    this.tileObjs.forEach(t => t.container.destroy());
    this.tileObjs.clear();
    this.drawEmptyCells();

    for (const cell of this.grid.filledCells()) {
      this.spawnTileObj(cell.row, cell.col, cell.value, cell.id, false);
    }

    this.updateHUD();
  }

  private tryMove(dir: Direction): void {
    if (this.isAnimating || this.gameOver) return;

    // Save undo state before move
    this.undoSnapshot = this.grid.snapshot();
    this.undoScore    = this.score;
    this.undoWon      = this.won;

    const result = this.grid.move(dir);
    if (!result.moved) return;  // 棋盘没变，忽略这次按键，保留上一步的撤销快照

    this.setUndoEnabled(true);
    this.isAnimating = true;
    this.score += result.score;
    if (result.score > 0) this.audio.playMerge();
    else                  this.audio.playMove();

    this.animateMoves(result);
  }

  private doUndo(): void {
    if (!this.undoSnapshot || this.isAnimating) return;

    // Restore grid state
    this.grid  = new Grid(this.undoSnapshot);
    this.score = this.undoScore;
    this.won   = this.undoWon;
    this.undoSnapshot = null;

    // Rebuild display from scratch
    this.tileObjs.forEach(t => t.container.destroy());
    this.tileObjs.clear();

    for (const cell of this.grid.filledCells()) {
      this.spawnTileObj(cell.row, cell.col, cell.value, cell.id, false);
    }

    this.clearOverlay();
    this.updateHUD();
    this.autoSave();
    this.setUndoEnabled(false);
  }

  // ── Animation ─────────────────────────────────────────────────────────────────

  private animateMoves(result: MoveResult): void {
    if (result.moves.length === 0) {
      this.onMoveComplete(result);
      return;
    }

    let pending = result.moves.length;
    const done = () => { if (--pending === 0) this.onMoveComplete(result); };

    for (const move of result.moves) {
      const obj = this.tileObjs.get(move.id);
      if (!obj) { done(); continue; }

      const to = this.tileCenter(move.toRow, move.toCol);
      if (move.fromRow === move.toRow && move.fromCol === move.toCol) {
        done();
        continue;
      }

      this.tweens.add({
        targets:  obj.container,
        x: to.x, y: to.y,
        duration: ANIM_MOVE_MS,
        ease: 'Quad.easeInOut',
        onComplete: done,
      });
    }
  }

  private onMoveComplete(result: MoveResult): void {
    // 1. Handle absorbed (merged-into) tiles: remove them
    const absorbed  = result.moves.filter(m => m.absorbed);
    const survivors = result.moves.filter(m => !m.absorbed);

    for (const m of absorbed) {
      this.tileObjs.get(m.id)?.container.destroy();
      this.tileObjs.delete(m.id);
    }

    // 2. Update survivor tiles that changed value (the merging ones)
    const mergedPositions = new Set(absorbed.map(m => `${m.toRow},${m.toCol}`));
    for (const m of survivors) {
      if (mergedPositions.has(`${m.toRow},${m.toCol}`)) {
        // This tile absorbed another — update its value display
        this.updateTileObj(m.id, m.newValue);
        // Bounce animation
        const obj = this.tileObjs.get(m.id);
        if (obj) {
          this.tweens.add({
            targets:  obj.container,
            scaleX: { from: 1.15, to: 1 },
            scaleY: { from: 1.15, to: 1 },
            duration: ANIM_MERGE_MS,
            ease: 'Back.easeOut',
          });
        }
      }
    }

    // 3. Spawn new tile
    if (result.newTile) {
      this.spawnTileObj(
        result.newTile.row, result.newTile.col,
        result.newTile.value, result.newTile.id,
        true,
      );
    }

    // 4. Update HUD and save
    this.updateHUD();
    this.autoSave();

    // 5. Check win
    if (!this.won && this.grid.hasValue(2048)) {
      this.won = true;
      this.audio.playWin();
      this.time.delayedCall(ANIM_SPAWN_MS + 50, () => this.showWinOverlay());
    }
    // 6. Check game over
    else if (!this.grid.canMove()) {
      this.gameOver = true;
      this.audio.playGameOver();
      this.time.delayedCall(300, () => this.showGameOverOverlay());
    }

    this.isAnimating = false;
  }

  // ── Tile display ──────────────────────────────────────────────────────────────

  /** Compute pixel center of tile at (row, col). */
  private tileCenter(row: number, col: number): { x: number; y: number } {
    return {
      x: GRID_X + TILE_GAP + col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
      y: GRID_Y + TILE_GAP + row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
    };
  }

  private drawEmptyCells(): void {
    if (this.gfxBoard) {
      this.gfxBoard.clear();
      this.gfxBoard.fillStyle(BOARD_BG_COLOR, 1);
      this.gfxBoard.fillRoundedRect(GRID_X, GRID_Y, BOARD_SIZE, BOARD_SIZE, 8);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const { x, y } = this.tileCenter(r, c);
          this.gfxBoard.fillStyle(TILE_BG_EMPTY, 1);
          this.gfxBoard.fillRoundedRect(
            x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 6,
          );
        }
      }
    }
  }

  private spawnTileObj(row: number, col: number, value: number, id: number, animate: boolean): void {
    const { x, y } = this.tileCenter(row, col);

    const gfx = this.add.graphics();
    const txt = this.add.text(0, 0, String(value), {
      fontSize:   this.tileFontSize(value),
      color:      value <= 4 ? TILE_TEXT_DARK : TILE_TEXT_LIGHT,
      fontStyle:  'bold',
      fontFamily: TILE_FONT_FAMILY,
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [gfx, txt]);
    container.setDepth(1);

    const obj: TileObj = { container, gfx, text: txt, value };
    this.drawTileBg(obj, value);
    this.tileObjs.set(id, obj);

    if (animate) {
      container.setScale(0);
      this.tweens.add({
        targets:  container,
        scaleX: 1, scaleY: 1,
        duration: ANIM_SPAWN_MS,
        ease: 'Back.easeOut',
      });
    }
  }

  private updateTileObj(id: number, newValue: number): void {
    const obj = this.tileObjs.get(id);
    if (!obj) return;
    obj.value = newValue;
    obj.text.setText(String(newValue));
    obj.text.setFontSize(this.tileFontSize(newValue));
    obj.text.setColor(newValue <= 4 ? TILE_TEXT_DARK : TILE_TEXT_LIGHT);
    this.drawTileBg(obj, newValue);
  }

  private drawTileBg(obj: TileObj, value: number): void {
    const color = TILE_BG_COLORS[value] ?? TILE_BG_OVER;
    obj.gfx.clear();
    obj.gfx.fillStyle(color, 1);
    obj.gfx.fillRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 6);
  }

  private tileFontSize(value: number): string {
    if (value < 100)   return '42px';
    if (value < 1000)  return '36px';
    if (value < 10000) return '28px';
    return '22px';
  }

  // ── HUD ───────────────────────────────────────────────────────────────────────

  private updateHUD(): void {
    StorageUtil.saveHighScore(this.score);
    this.best = Math.max(this.best, this.score);
    this.txtScore.setText(String(this.score));
    this.txtBest.setText(String(this.best));
  }

  // ── Overlays ──────────────────────────────────────────────────────────────────

  private clearOverlay(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.gameOver = false;
  }

  private showWinOverlay(): void {
    if (this.overlay) return;
    const cx = CANVAS_WIDTH / 2;
    const cy = GRID_Y + BOARD_SIZE / 2;

    const items: Phaser.GameObjects.GameObject[] = [];

    const bg = this.add.rectangle(cx, cy, BOARD_SIZE, BOARD_SIZE, 0xedc22e, 0.88)
      .setOrigin(0.5);
    items.push(bg);

    items.push(this.add.text(cx, cy - 80, '🎉 恭喜！', {
      fontSize: '40px', color: '#776e65', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));
    items.push(this.add.text(cx, cy - 28, '你成功合并出 2048！', {
      fontSize: '22px', color: '#776e65', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));
    items.push(this.add.text(cx, cy + 14, `得分: ${this.score}`, {
      fontSize: '28px', color: '#f9f6f2', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));

    // Continue button
    const contBg = this.add.rectangle(cx - 80, cy + 80, 140, 46, 0x8f7a66)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const contTxt = this.add.text(cx - 80, cy + 80, '继续游戏', {
      fontSize: '20px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    contBg.on('pointerdown', () => this.clearOverlay());
    contTxt.setInteractive().on('pointerdown', () => this.clearOverlay());
    items.push(contBg, contTxt);

    // Restart button
    const restBg = this.add.rectangle(cx + 80, cy + 80, 140, 46, 0xf65e3b)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const restTxt = this.add.text(cx + 80, cy + 80, '重新开始', {
      fontSize: '20px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    restBg.on('pointerdown', () => { this.clearOverlay(); this.startNewGame(); });
    restTxt.setInteractive().on('pointerdown', () => { this.clearOverlay(); this.startNewGame(); });
    items.push(restBg, restTxt);

    this.overlay = this.add.container(0, 0, items).setDepth(10);
  }

  private showGameOverOverlay(): void {
    if (this.overlay) return;
    const cx = CANVAS_WIDTH / 2;
    const cy = GRID_Y + BOARD_SIZE / 2;

    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(
      this.add.rectangle(cx, cy, BOARD_SIZE, BOARD_SIZE, 0x1a1a2e, 0.88).setOrigin(0.5)
    );
    items.push(this.add.text(cx, cy - 70, '游 戏 结 束', {
      fontSize: '36px', color: '#ff4444', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));
    items.push(this.add.text(cx, cy - 18, `得分: ${this.score}`, {
      fontSize: '28px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));
    items.push(this.add.text(cx, cy + 22, `最高分: ${this.best}`, {
      fontSize: '22px', color: '#ffdd44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));

    const restBg = this.add.rectangle(cx, cy + 80, 180, 50, 0x6666ff)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const restTxt = this.add.text(cx, cy + 80, '重 新 开 始', {
      fontSize: '22px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    restBg.on('pointerdown', () => { this.clearOverlay(); this.startNewGame(); });
    restTxt.setInteractive().on('pointerdown', () => { this.clearOverlay(); this.startNewGame(); });
    items.push(restBg, restTxt);

    this.overlay = this.add.container(0, 0, items).setDepth(10);
    StorageUtil.clearCurrentGame();
  }

  private showSaveAndExit(): void {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const popup = this.add.container(0, 0, [
      this.add.rectangle(cx, cy, 220, 64, 0x8f7a66, 0.95).setOrigin(0.5),
      this.add.text(cx, cy, '✓ 游戏已保存', {
        fontSize: '22px', color: '#ffffff', fontStyle: 'bold', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5),
    ]).setDepth(50);

    this.time.delayedCall(700, () => {
      popup.destroy();
      // In production the game lives under /xxx/2048/ so '../' reaches the platform root.
      // In standalone dev server (localhost:8083/) pathname is '/' — navigate back in history.
      const segments = window.location.pathname.split('/').filter(s => s !== '');
      if (segments.length > 0) {
        window.location.href = '../';
      } else {
        window.history.back();
      }
    });
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  private autoSave(): void {
    const snap  = this.grid.snapshot();
    const cells = snap.cells.map(r => r.map(c => c?.value ?? null));
    const ids   = snap.cells.map(r => r.map(c => c?.id   ?? null));
    StorageUtil.saveCurrentGame({
      cells, ids,
      score:  this.score,
      nextId: snap.nextId,
      won:    this.won,
    });
  }
}
