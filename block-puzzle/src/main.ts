import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';

// 等字体加载完再初始化，避免第一帧使用系统备用字体
document.fonts.ready.then(() => {
  new Phaser.Game(GameConfig);
});
