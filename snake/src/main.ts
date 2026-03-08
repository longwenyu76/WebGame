import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';

document.fonts.ready.then(() => {
  new Phaser.Game(GameConfig);
});
