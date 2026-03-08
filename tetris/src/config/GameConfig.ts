import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { PauseScene } from '../scenes/PauseScene';
import { SettingsScene } from '../scenes/SettingsScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 780,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER, // 由 CSS flexbox 负责居中
    min: { width: 320, height: 520 },
    max: { width: 960, height: 1560 },
  },
  // 针对 iOS Safari 禁止双击缩放和触摸滚动
  input: {
    activePointers: 3, // 支持多点触控（旋转 + 移动同时操作）
  },
  // 渲染优化
  render: {
    antialias: true,        // 中文字体需要抗锯齿
    pixelArt: false,
    roundPixels: true,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, PauseScene, SettingsScene],
};
