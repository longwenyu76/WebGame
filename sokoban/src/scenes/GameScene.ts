import Phaser from 'phaser';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, FONT_FAMILY,
  COLOR_BG,
  COLOR_BTN, COLOR_BTN_HOVER, COLOR_BTN_UNDO, COLOR_BTN_RESET,
  ANIM_MOVE_MS,
  HUD_HEIGHT, GAME_AREA_TOP, GAME_AREA_H, CTRL_HEIGHT,
  TILE_MAX,
  SCENE_KEYS,
} from '../constants/GameConstants';
import { GameLogic, Cell } from '../game/GameLogic';
import { AudioManager } from '../game/AudioManager';
import { LEVELS, OPTIMAL_MOVES } from '../config/levels';
import { StorageUtil } from '../utils/StorageUtil';

// ── 素材帧名 ─────────────────────────────────────────────────────────────────
const FRAME_WALL        = 'block_05.png';
const FRAME_FLOOR       = 'ground_03.png';
const FRAME_TARGET      = 'environment_01.png';
const FRAME_BOX         = 'crate_02.png';
const FRAME_BOX_ON_TGT  = 'crate_05.png';
const FRAME_PLAYER      = 'player_05.png';

// ── 单个可移动对象（玩家 / 箱子）────────────────────────────────────────────
interface MobileObj {
  img: Phaser.GameObjects.Image;
  row: number;
  col: number;
}

export class GameScene extends Phaser.Scene {
  // ── 音效 ────────────────────────────────────────────────────────────────
  private audio!: AudioManager;

  // ── 游戏状态 ────────────────────────────────────────────────────────────
  private logic!:       GameLogic;
  private levelIndex:   number = 0;
  private isAnimating:  boolean = false;
  private elapsedSec:   number = 0;
  private gameStarted:  boolean = false;

  // ── 渲染参数 ────────────────────────────────────────────────────────────
  private tileSize:  number = 48;
  private gridOffX:  number = 0;
  private gridOffY:  number = 0;

  // ── 显示对象 ────────────────────────────────────────────────────────────
  private bgTiles:    Phaser.GameObjects.Image[] = []; // 静态背景（墙/地板/目标）
  private playerObj!: MobileObj;
  private boxObjs:    MobileObj[] = [];                // 与 logic 中箱子顺序对应
  private overlay:    Phaser.GameObjects.Container | null = null;

  // ── HUD ─────────────────────────────────────────────────────────────────
  private txtLevel!:  Phaser.GameObjects.Text;
  private txtMoves!:  Phaser.GameObjects.Text;
  private txtPushes!: Phaser.GameObjects.Text;
  private txtTimer!:  Phaser.GameObjects.Text;
  private txtBoxes!:  Phaser.GameObjects.Text;

  // ── 输入 ────────────────────────────────────────────────────────────────
  private keyUp!:    Phaser.Input.Keyboard.Key;
  private keyDown!:  Phaser.Input.Keyboard.Key;
  private keyLeft!:  Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyW!:     Phaser.Input.Keyboard.Key;
  private keyA!:     Phaser.Input.Keyboard.Key;
  private keyS!:     Phaser.Input.Keyboard.Key;
  private keyD!:     Phaser.Input.Keyboard.Key;
  private keyZ!:     Phaser.Input.Keyboard.Key;
  private keyU!:     Phaser.Input.Keyboard.Key;
  private keyR!:     Phaser.Input.Keyboard.Key;
  private keyN!:     Phaser.Input.Keyboard.Key;
  private swipeStart:  { x: number; y: number } | null = null;
  private inputReady:  boolean = false;   // 防止场景切换时指针事件穿透

  constructor() { super({ key: SCENE_KEYS.GAME }); }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  init(data: { levelIndex?: number }): void {
    this.levelIndex  = data.levelIndex ?? 0;
    this.isAnimating = false;
    this.elapsedSec  = 0;
    this.gameStarted = false;
    this.overlay     = null;
    this.boxObjs     = [];
    this.inputReady  = false;
  }

  create(): void {
    this.audio = new AudioManager();
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BG);

    this.setupInput();
    this.createHUD();
    this.createControls();
    this.loadLevel(this.levelIndex);

    this.audio.startBGM();

    // 场景关闭时停止 BGM
    this.events.on('shutdown', () => { this.audio.stopBGM(); });

    // inputReady 由 update() 中检测到指针抬起后才设为 true，防止场景切换时穿透
  }

  /** 供 SettingsScene 调用，立即应用新设置 */
  applySettings(): void {
    this.audio.applySettings();
  }

  update(_t: number, delta: number): void {
    // 等待指针完全抬起后再开放输入，防止场景切换时 pointerdown 穿透
    if (!this.inputReady) {
      if (!this.input.activePointer.isDown) {
        this.inputReady = true;
      }
      return;
    }

    if (this.gameStarted && !this.isAnimating && !this.overlay) {
      this.elapsedSec += delta / 1000;
      this.txtTimer.setText(this.formatTime(this.elapsedSec));
    }

    if (this.isAnimating || this.overlay) return;

    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.keyR)) { this.doReset(); return; }
    if (JD(this.keyN)) { this.goNextLevel(); return; }
    if (JD(this.keyZ) || JD(this.keyU)) { this.doUndo(); return; }

    if (JD(this.keyUp)    || JD(this.keyW)) this.tryMove(-1, 0);
    else if (JD(this.keyDown)  || JD(this.keyS)) this.tryMove(1, 0);
    else if (JD(this.keyLeft)  || JD(this.keyA)) this.tryMove(0, -1);
    else if (JD(this.keyRight) || JD(this.keyD)) this.tryMove(0, 1);
  }

  // ── 关卡加载 ─────────────────────────────────────────────────────────────

  private loadLevel(idx: number): void {
    this.levelIndex = Phaser.Math.Clamp(idx, 0, LEVELS.length - 1);
    this.logic = new GameLogic(LEVELS[this.levelIndex]);
    this.isAnimating = false;
    this.elapsedSec  = 0;
    this.gameStarted = false;

    StorageUtil.saveLastLevel(this.levelIndex);

    // 计算瓦片尺寸和偏移，让地图居中在游戏区域内
    // 优先保证地图完整显示，不强制最小尺寸（避免大地图溢出）
    const maxW = (CANVAS_WIDTH - 8) / this.logic.cols;
    const maxH = (GAME_AREA_H - 8) / this.logic.rows;
    this.tileSize = Math.floor(Math.min(maxW, maxH, TILE_MAX));

    const mapW = this.logic.cols * this.tileSize;
    const mapH = this.logic.rows * this.tileSize;
    this.gridOffX = Math.floor((CANVAS_WIDTH - mapW) / 2);
    this.gridOffY = Math.floor(GAME_AREA_TOP + (GAME_AREA_H - mapH) / 2);

    this.destroyGameObjects();
    this.drawBackground();
    this.createMobileObjects();
    this.updateHUD();
    this.clearOverlay();
  }

  // ── 背景绘制（墙/地板/目标）─────────────────────────────────────────────

  private drawBackground(): void {
    this.bgTiles.forEach(t => t.destroy());
    this.bgTiles = [];

    const sc   = this.tileSize / 64;
    const half = this.tileSize / 2;

    // 洪水填充：从玩家出发找出所有内部格（内部空地 vs 外部空白都是 ' '）
    const interior = new Set<number>();
    const bfsQ: [number, number][] = [[this.logic.pRow, this.logic.pCol]];
    interior.add(this.logic.pRow * 10000 + this.logic.pCol);
    while (bfsQ.length > 0) {
      const [r, c] = bfsQ.shift()!;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= this.logic.rows || nc < 0 || nc >= this.logic.cols) continue;
        const k = nr * 10000 + nc;
        if (interior.has(k)) continue;
        if (this.logic.getCell(nr, nc) === '#') continue;
        interior.add(k);
        bfsQ.push([nr, nc]);
      }
    }

    const addTile = (cx: number, cy: number, frame: string) => {
      this.bgTiles.push(
        this.add.image(cx, cy, 'sokoban', frame).setScale(sc).setOrigin(0.5).setDepth(0),
      );
    };

    for (let r = 0; r < this.logic.rows; r++) {
      for (let c = 0; c < this.logic.cols; c++) {
        const cell = this.logic.getCell(r, c);
        // 外部空白跳过
        if (cell === ' ' && !interior.has(r * 10000 + c)) continue;

        const cx = this.gridOffX + c * this.tileSize + half;
        const cy = this.gridOffY + r * this.tileSize + half;

        if (cell === '#') {
          addTile(cx, cy, FRAME_WALL);
        } else if (cell === '.' || cell === '*' || cell === '+') {
          // 目标格：先铺地板，再叠目标标记
          addTile(cx, cy, FRAME_FLOOR);
          addTile(cx, cy, FRAME_TARGET);
        } else {
          // 内部空地（含初始玩家格、箱子格）
          addTile(cx, cy, FRAME_FLOOR);
        }
      }
    }
  }

  // ── 移动对象（玩家/箱子）────────────────────────────────────────────────

  private createMobileObjects(): void {
    const sc   = this.tileSize / 64;
    const half = this.tileSize / 2;

    // 创建所有箱子
    this.boxObjs = [];
    for (let r = 0; r < this.logic.rows; r++) {
      for (let c = 0; c < this.logic.cols; c++) {
        const cell = this.logic.getCell(r, c);
        if (cell === '$' || cell === '*') {
          const { x, y } = this.cellCenter(r, c);
          const img = this.add.image(x, y, 'sokoban', cell === '*' ? FRAME_BOX_ON_TGT : FRAME_BOX)
            .setScale(sc).setOrigin(0.5).setDepth(1);
          this.boxObjs.push({ img, row: r, col: c });
        }
      }
    }

    // 创建玩家
    const { x: px, y: py } = this.cellCenter(this.logic.pRow, this.logic.pCol);
    const pimg = this.add.image(px, py, 'sokoban', FRAME_PLAYER)
      .setScale(sc).setOrigin(0.5).setDepth(2);
    this.playerObj = { img: pimg, row: this.logic.pRow, col: this.logic.pCol };
  }

  // ── 移动逻辑 ─────────────────────────────────────────────────────────────

  private tryMove(dr: number, dc: number): void {
    if (!this.inputReady || this.isAnimating) return;
    this.gameStarted = true;

    const oldPR = this.logic.pRow;
    const oldPC = this.logic.pCol;

    // 找被推的箱子（如果有）
    const boxR = oldPR + dr;
    const boxC = oldPC + dc;
    const boxCell = this.logic.getCell(boxR, boxC);
    const isPushing = boxCell === '$' || boxCell === '*';
    let pushedBoxObj: MobileObj | null = null;
    if (isPushing) {
      pushedBoxObj = this.boxObjs.find(b => b.row === boxR && b.col === boxC) ?? null;
    }

    const result = this.logic.move(dr, dc);
    if (!result.moved) return;

    this.isAnimating = true;

    // 动画：移动玩家
    const { x: px, y: py } = this.cellCenter(this.logic.pRow, this.logic.pCol);
    this.playerObj.row = this.logic.pRow;
    this.playerObj.col = this.logic.pCol;

    // 动画：移动箱子（如果有）
    if (pushedBoxObj) {
      const newBoxR = boxR + dr;
      const newBoxC = boxC + dc;
      pushedBoxObj.row = newBoxR;
      pushedBoxObj.col = newBoxC;
      const { x: bx, y: by } = this.cellCenter(newBoxR, newBoxC);
      const onTarget = this.logic.getCell(newBoxR, newBoxC) === '*';
      this.tweens.add({
        targets: pushedBoxObj.img,
        x: bx, y: by,
        duration: ANIM_MOVE_MS,
        ease: 'Quad.easeOut',
        onComplete: () => {
          pushedBoxObj!.img.setFrame(onTarget ? FRAME_BOX_ON_TGT : FRAME_BOX);
        },
      });
    }

    // 立刻播放音效（不等动画）
    if (result.pushed) {
      const landedOnTarget = this.logic.getCell(
        this.logic.pRow + dr, this.logic.pCol + dc
      ) === '*';
      if (landedOnTarget) this.audio.playBoxOnTarget();
      else                this.audio.playPush();
    } else {
      this.audio.playMove();
    }

    this.tweens.add({
      targets: this.playerObj.img,
      x: px, y: py,
      duration: ANIM_MOVE_MS,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.isAnimating = false;
        this.updateHUD();
        if (result.won) this.onWin();
      },
    });
  }

  // ── 撤销 ─────────────────────────────────────────────────────────────────

  private doUndo(): void {
    if (!this.logic.canUndo() || this.isAnimating) return;
    this.audio.playUndo();
    this.logic.undo();
    this.destroyGameObjects();
    this.drawBackground();
    this.createMobileObjects();
    this.updateHUD();
  }

  // ── 重开 / 下一关 ─────────────────────────────────────────────────────────

  private doReset(): void {
    this.clearOverlay();
    this.loadLevel(this.levelIndex);
  }

  private goNextLevel(): void {
    this.clearOverlay();
    if (this.levelIndex + 1 < LEVELS.length) {
      this.loadLevel(this.levelIndex + 1);
    } else {
      this.scene.start(SCENE_KEYS.SELECT);
    }
  }

  // ── 胜利 ─────────────────────────────────────────────────────────────────

  private onWin(): void {
    this.audio.playWin();
    StorageUtil.saveRecord(this.levelIndex, this.logic.moves, OPTIMAL_MOVES[this.levelIndex]);
    const rec = StorageUtil.getRecord(this.levelIndex);

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(this.add.rectangle(cx, cy, 360, 340, 0x0d0d2a, 0.95).setOrigin(0.5));
    items.push(this.add.text(cx, cy - 120, '关卡完成！', {
      fontSize: '36px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));

    const starsText = '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
    items.push(this.add.text(cx, cy - 72, starsText, {
      fontSize: '32px', color: '#f1c40f', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5));

    const stats = [
      `步数: ${this.logic.moves}   推箱: ${this.logic.pushes}`,
      `用时: ${this.formatTime(this.elapsedSec)}`,
      rec.bestMoves > 0 ? `最佳: ${rec.bestMoves} 步` : '',
    ];
    stats.forEach((s, i) => {
      if (!s) return;
      items.push(this.add.text(cx, cy - 20 + i * 30, s, {
        fontSize: '18px', color: '#ecf0f1', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5));
    });

    // 按钮行
    const btnY = cy + 110;
    const btns: [string, () => void, number][] = [
      ['下一关', () => this.goNextLevel(), 0x2980b9],
      ['重  玩', () => this.doReset(),     0x27ae60],
      ['选  关', () => this.scene.start(SCENE_KEYS.SELECT), 0x8f7a66],
    ];
    btns.forEach(([label, fn, color], i) => {
      const bx = cx - 110 + i * 110;
      const bg = this.add.rectangle(bx, btnY, 100, 44, color)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      const txt = this.add.text(bx, btnY, label, {
        fontSize: '17px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', fn);
      txt.on('pointerdown', fn);
      items.push(bg, txt);
    });

    this.overlay = this.add.container(0, 0, items).setDepth(20);

    // 箱子闪烁庆祝效果（基于实际 scale 做相对缩放）
    const sc = this.tileSize / 64;
    this.boxObjs.forEach((b, i) => {
      this.tweens.add({
        targets: b.img,
        scaleX: { from: sc * 1.2, to: sc }, scaleY: { from: sc * 1.2, to: sc },
        duration: 300,
        delay: i * 60,
        ease: 'Back.easeOut',
      });
    });
  }

  // ── HUD ──────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const cx = CANVAS_WIDTH / 2;
    this.add.rectangle(cx, HUD_HEIGHT / 2, CANVAS_WIDTH, HUD_HEIGHT, 0x0d0d2a);

    // 行1：关卡名 + 计时器
    this.txtLevel = this.add.text(16, 12, '', {
      fontSize: '18px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    });
    this.txtTimer = this.add.text(CANVAS_WIDTH - 16, 12, '0:00', {
      fontSize: '18px', color: '#ecf0f1', fontFamily: FONT_FAMILY,
    }).setOrigin(1, 0);

    // 行2：步数 + 推箱 + 箱子进度
    this.txtMoves = this.add.text(16, 38, '', {
      fontSize: '15px', color: '#bdc3c7', fontFamily: FONT_FAMILY,
    });
    this.txtPushes = this.add.text(140, 38, '', {
      fontSize: '15px', color: '#bdc3c7', fontFamily: FONT_FAMILY,
    });
    this.txtBoxes = this.add.text(CANVAS_WIDTH - 16, 38, '', {
      fontSize: '15px', color: '#27ae60', fontFamily: FONT_FAMILY,
    }).setOrigin(1, 0);

    // 行3：五按钮（返回/撤销/重开/选关/设置）
    const btnY = 80;
    const btnW = 84;
    const btnH = 26;
    const openSettings = () => {
      this.scene.launch(SCENE_KEYS.SETTINGS, { from: 'game' });
      this.scene.pause();
    };
    const btns: [string, () => void, number][] = [
      ['返回', () => this.scene.start(SCENE_KEYS.MENU),         0x4a5568],
      ['撤销', () => { if (!this.isAnimating) this.doUndo(); }, COLOR_BTN_UNDO],
      ['重开', () => this.doReset(),                             COLOR_BTN_RESET],
      ['选关', () => this.scene.start(SCENE_KEYS.SELECT),        0x4a5568],
      ['设置', openSettings,                                     0x2c5364],
    ];
    // 5 等分 480px：中心 48 / 144 / 240 / 336 / 432
    const bxList = [48, 144, 240, 336, 432];
    btns.forEach(([label, fn, color], i) => {
      const bx = bxList[i];
      this.add.rectangle(bx + 2, btnY + 4, btnW, btnH, 0x0c0e16).setOrigin(0.5);
      const bg = this.add.rectangle(bx, btnY, btnW, btnH, color)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.add.rectangle(bx, btnY - btnH / 2 + 1, btnW - 4, 2, 0x7a9ab5).setOrigin(0.5, 0);
      this.add.rectangle(bx, btnY + btnH / 2 - 3, btnW - 4, 2, 0x1e2d3d).setOrigin(0.5, 0);
      this.add.text(bx, btnY, label, {
        fontSize: '13px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', fn);
      bg.on('pointerdown', fn);
    });
  }

  private updateHUD(): void {
    this.txtLevel.setText(`第 ${this.levelIndex + 1} 关`);
    this.txtTimer.setText(this.formatTime(this.elapsedSec));
    this.txtMoves.setText(`步数: ${this.logic.moves}`);
    this.txtPushes.setText(`推箱: ${this.logic.pushes}`);
    this.txtBoxes.setText(`箱子: ${this.logic.boxesOnTarget()} / ${this.logic.numBoxes}`);
  }

  // ── 底部控制区 ───────────────────────────────────────────────────────────

  private createControls(): void {
    const cx  = CANVAS_WIDTH / 2;
    const top = GAME_AREA_TOP + GAME_AREA_H;

    // 背景
    this.add.rectangle(cx, top + CTRL_HEIGHT / 2, CANVAS_WIDTH, CTRL_HEIGHT, 0x0d0d2a);

    // 虚拟方向键（居中）
    const dpadCX = cx;
    const dpadCY = top + 82;
    const ds     = 52; // 按钮间距

    const dirs: [string, number, number, number, number][] = [
      ['↑', 0,  -1,   dpadCX,       dpadCY - ds],
      ['↓', 0,   1,   dpadCX,       dpadCY + ds],
      ['←', -1,  0,   dpadCX - ds,  dpadCY],
      ['→',  1,  0,   dpadCX + ds,  dpadCY],
    ];

    dirs.forEach(([label, dc, dr, bx, by]) => {
      const dw = ds - 4;
      this.add.rectangle(bx + 2, by + 4, dw, dw, 0x0c0e16).setOrigin(0.5);
      const bg = this.add.rectangle(bx, by, dw, dw, COLOR_BTN, 1)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.add.text(bx, by, label, {
        fontSize: '26px', color: '#ecf0f1', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { if (!this.isAnimating && !this.overlay) this.tryMove(dr, dc); });

      this.add.rectangle(bx, by - dw / 2 + 1, dw - 4, 3, 0x7a9ab5).setOrigin(0.5, 0);
      this.add.rectangle(bx, by + dw / 2 - 4, dw - 4, 3, 0x1e2d3d).setOrigin(0.5, 0);
      bg.on('pointerdown', () => { if (!this.isAnimating && !this.overlay) this.tryMove(dr, dc); });
      bg.on('pointerover', () => bg.setFillStyle(COLOR_BTN_HOVER));
      bg.on('pointerout',  () => bg.setFillStyle(COLOR_BTN));
    });
  }

  // ── 输入设置 ─────────────────────────────────────────────────────────────

  private setupInput(): void {
    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keyUp    = kb.addKey(KC.UP);
    this.keyDown  = kb.addKey(KC.DOWN);
    this.keyLeft  = kb.addKey(KC.LEFT);
    this.keyRight = kb.addKey(KC.RIGHT);
    this.keyW     = kb.addKey(KC.W);
    this.keyA     = kb.addKey(KC.A);
    this.keyS     = kb.addKey(KC.S);
    this.keyD     = kb.addKey(KC.D);
    this.keyZ     = kb.addKey(KC.Z);
    this.keyU     = kb.addKey(KC.U);
    this.keyR     = kb.addKey(KC.R);
    this.keyN     = kb.addKey(KC.N);

    // 滑动手势
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.inputReady) return;
      this.swipeStart = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (this.isAnimating || this.overlay) return;
      if (Math.abs(dx) >= Math.abs(dy)) this.tryMove(0, dx > 0 ? 1 : -1);
      else                              this.tryMove(dy > 0 ? 1 : -1, 0);
    });
  }

  // ── 工具 ─────────────────────────────────────────────────────────────────

  private cellCenter(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridOffX + col * this.tileSize + this.tileSize / 2,
      y: this.gridOffY + row * this.tileSize + this.tileSize / 2,
    };
  }

  private destroyGameObjects(): void {
    this.bgTiles.forEach(t => t.destroy());
    this.bgTiles = [];
    this.playerObj?.img.destroy();
    this.boxObjs.forEach(b => b.img.destroy());
    this.boxObjs = [];
  }

  private clearOverlay(): void {
    this.overlay?.destroy();
    this.overlay = null;
  }

  private formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
