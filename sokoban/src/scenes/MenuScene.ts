import Phaser from 'phaser';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FONT_FAMILY, COLOR_BG, COLOR_BTN, COLOR_BTN_HOVER,
  SCENE_KEYS,
} from '../constants/GameConstants';
import { StorageUtil } from '../utils/StorageUtil';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.MENU }); }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    // 背景
    this.add.rectangle(cx, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BG);

    // 返回游戏平台
    const backBtn = this.add.text(14, 14, '← 游戏平台', {
      fontSize: '14px', color: '#445566', fontFamily: FONT_FAMILY,
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#aabbcc'));
    backBtn.on('pointerout',  () => backBtn.setColor('#445566'));
    backBtn.on('pointerdown', () => { window.location.href = '../'; });

    // 标题
    this.add.text(cx, 96, '推箱工人', {
      fontSize: '52px', color: '#f39c12', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    this.add.text(cx, 154, 'Box Pusher', {
      fontSize: '22px', color: '#bdc3c7', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    // 小图示（副标题下方，与按钮之间留空）
    this.drawLogo(cx, 300);

    const btnY = [436, 512, 588, 664];
    const btns = ['开 始 游 戏', '选 择 关 卡', '音 量 设 置', '游 戏 说 明'];
    const actions = [
      () => {
        const last = StorageUtil.getLastLevel();
        this.scene.start(SCENE_KEYS.GAME, { levelIndex: last });
      },
      () => this.scene.start(SCENE_KEYS.SELECT),
      () => this.scene.start(SCENE_KEYS.SETTINGS),
      () => this.scene.start(SCENE_KEYS.HELP),
    ];

    btns.forEach((label, i) => {
      this.makeButton(cx, btnY[i], label, actions[i]);
    });

    // 版权
    this.add.text(cx, CANVAS_HEIGHT - 20, '灵感来自经典游戏 Sokoban · Built with Phaser 3', {
      fontSize: '11px', color: '#4a5568', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5, 1);
  }

  private drawLogo(cx: number, cy: number): void {
    const ts  = 34;                // 显示尺寸（像素）
    const sc  = ts / 64;          // 素材原始尺寸 64px
    const FRAMES: Record<number, string> = {
      1: 'block_05.png',         // 墙
      0: 'ground_03.png',        // 地板
      2: 'environment_01.png',   // 目标点
      3: 'crate_02.png',         // 箱子
      4: 'player_05.png',        // 玩家
    };
    const layout = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 2, 0, 1],
      [1, 3, 0, 4, 1],
      [1, 1, 1, 1, 1],
    ];
    const ox = cx - (5 * ts) / 2 + ts / 2;
    const oy = cy - (5 * ts) / 2 + ts / 2;
    layout.forEach((row, r) => row.forEach((cell, c) => {
      const x = ox + c * ts;
      const y = oy + r * ts;
      // 先铺地板，再叠特殊元素
      this.add.image(x, y, 'sokoban', FRAMES[0]).setScale(sc).setOrigin(0.5);
      if (cell !== 0) {
        this.add.image(x, y, 'sokoban', FRAMES[cell]).setScale(sc).setOrigin(0.5);
      }
    }));
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const w = 240, h = 52;
    // 底部偏移深色（凸起感来自下方阴影）
    this.add.rectangle(x + 3, y + 5, w, h, 0x0c0e16).setOrigin(0.5);
    // 主体
    const bg = this.add.rectangle(x, y, w, h, COLOR_BTN)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    // 顶部亮条（模拟上方光源）
    this.add.rectangle(x, y - h / 2 + 1, w - 8, 4, 0x7a9ab5).setOrigin(0.5, 0);
    // 底部暗条（强化立体层次）
    this.add.rectangle(x, y + h / 2 - 5, w - 8, 4, 0x1e2d3d).setOrigin(0.5, 0);
    const txt = this.add.text(x, y, label, {
      fontSize: '22px', color: '#f9f6f2', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const over = () => bg.setFillStyle(COLOR_BTN_HOVER);
    const out  = () => bg.setFillStyle(COLOR_BTN);
    bg.on('pointerover', over).on('pointerout', out).on('pointerdown', onClick);
    txt.on('pointerover', over).on('pointerout', out).on('pointerdown', onClick);
  }

}
