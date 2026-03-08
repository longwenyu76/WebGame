import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY, GameMode } from '../constants/GameConstants';

interface GameOverData {
  score:       number;
  length:      number;
  mode:        GameMode;
  best:        number;
  isNewRecord: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data: GameOverData): void {
    const cx     = CANVAS_WIDTH / 2;
    const score  = data.score       ?? 0;
    const length = data.length      ?? 1;
    const best   = data.best        ?? score;
    const mode   = data.mode        ?? 'classic';
    const isNew  = data.isNewRecord ?? false;

    // Dialog backdrop
    const boxH = isNew ? 320 : 300;
    this.add.rectangle(cx, 330, 360, boxH, 0x000000, 0.90)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0x224422, 1);

    // Title
    this.add.text(cx, 205, 'GAME OVER', {
      fontSize: '36px', color: '#ff3333', fontStyle: 'bold', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    // New record badge
    let nextY = 258;
    if (isNew) {
      this.add.text(cx, nextY, '★ 新纪录！★', {
        fontSize: '20px', color: '#ffdd00', fontStyle: 'bold', fontFamily: FONT_FAMILY,
      }).setOrigin(0.5);
      nextY += 36;
    }

    // Score
    this.add.text(cx, nextY, `得分: ${score}`, {
      fontSize: '28px', color: '#ffffff', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    nextY += 38;

    // Length + mode label on same line
    const modeLabel = mode === 'classic' ? '经典' : '增强';
    this.add.text(cx - 60, nextY, `长度: ${length}`, {
      fontSize: '18px', color: '#aaaaaa', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    this.add.text(cx + 60, nextY, `模式: ${modeLabel}`, {
      fontSize: '18px', color: '#aaaaaa', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    nextY += 36;

    // Best score
    this.add.text(cx, nextY, `最高分: ${best}`, {
      fontSize: '18px', color: '#ffdd44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);
    nextY += 50;

    // Buttons — horizontal layout
    const restartBtn = this.add.text(cx - 88, nextY, '[ 再来一局 ]', {
      fontSize: '22px', color: '#44ff44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menuBtn = this.add.text(cx + 88, nextY, '[ 回到主页 ]', {
      fontSize: '22px', color: '#ffaa44', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setColor('#88ff88'));
    restartBtn.on('pointerout',  () => restartBtn.setColor('#44ff44'));
    restartBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.GAME_OVER);
      this.scene.start(SCENE_KEYS.GAME, { mode });
    });

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffdd88'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#ffaa44'));
    menuBtn.on('pointerdown', () => {
      this.scene.stop(SCENE_KEYS.GAME_OVER);
      this.scene.stop(SCENE_KEYS.GAME);
      this.scene.start(SCENE_KEYS.MENU);
    });
  }
}
