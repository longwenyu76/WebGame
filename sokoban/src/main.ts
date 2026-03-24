import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants/GameConstants';
import { BootScene }        from './scenes/BootScene';
import { MenuScene }        from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene }        from './scenes/GameScene';
import { SettingsScene }    from './scenes/SettingsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width:  CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, SettingsScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    min: { width: 320, height: 533 },
    max: { width: 960, height: 1600 },
  },
  render: { antialias: true, roundPixels: true },
};

document.fonts.ready.then(() => {
  new Phaser.Game(config);
});
