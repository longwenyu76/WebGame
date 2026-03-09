import Phaser from 'phaser';
import { BootScene }     from '../scenes/BootScene';
import { MenuScene }     from '../scenes/MenuScene';
import { GameScene }     from '../scenes/GameScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { PauseScene }    from '../scenes/PauseScene';
import { SettingsScene } from '../scenes/SettingsScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 780,
  backgroundColor: '#0a1a0a',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    min: { width: 320, height: 520 },
    max: { width: 960, height: 1560 },
  },
  input: {
    activePointers: 2,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, PauseScene, SettingsScene],
};
