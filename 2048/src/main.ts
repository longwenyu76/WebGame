import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants/GameConstants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width:  CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#faf8ef',
  scene: [BootScene, GameScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,   // CSS flex 负责居中
    min: { width: 320, height: 520 },
    max: { width: 960, height: 1560 },
  },
  render: { antialias: true, roundPixels: true },
};

// 等字体加载完再启动，确保 Ma Shan Zheng 可用
document.fonts.ready.then(() => {
  new Phaser.Game(config);
});
