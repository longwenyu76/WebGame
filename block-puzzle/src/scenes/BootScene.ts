import Phaser from 'phaser';
import { SCENE_KEYS, AUDIO_KEYS, FONT_FAMILY } from '../constants/GameConstants';

// 所有音频文件（ogg 优先，mp3 备用）
const AUDIO_FILES: { key: string; urls: string[] }[] = [
  { key: AUDIO_KEYS.BGM,       urls: ['assets/audio/bgm.ogg',       'assets/audio/bgm.mp3'] },
  { key: AUDIO_KEYS.MOVE,      urls: ['assets/audio/move.ogg',      'assets/audio/move.mp3'] },
  { key: AUDIO_KEYS.ROTATE,    urls: ['assets/audio/rotate.ogg',    'assets/audio/rotate.mp3'] },
  { key: AUDIO_KEYS.CLEAR,     urls: ['assets/audio/clear.ogg',     'assets/audio/clear.mp3'] },
  { key: AUDIO_KEYS.GAME_OVER, urls: ['assets/audio/gameover.ogg',  'assets/audio/gameover.mp3'] },
  { key: 'tetris_sfx',         urls: ['assets/audio/tetris_sfx.ogg','assets/audio/tetris_sfx.mp3'] },
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    this.createLoadingBar();

    // 音频文件缺失时静默跳过，不阻塞加载
    this.load.on('loaderror', () => { /* ignore missing assets */ });

    for (const { key, urls } of AUDIO_FILES) {
      this.load.audio(key, urls);
    }
  }

  create(): void {
    this.scene.start(SCENE_KEYS.MENU);
  }

  private createLoadingBar(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.text(cx, cy - 40, 'Loading...', {
      fontSize: '20px', color: '#aaaaaa', fontFamily: FONT_FAMILY,
    }).setOrigin(0.5);

    const barBg  = this.add.rectangle(cx, cy, 240, 16, 0x333355).setOrigin(0.5);
    const barFill = this.add.rectangle(cx - 120, cy, 0, 12, 0x00f0f0).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      barFill.setSize(240 * value, 12);
    });
  }
}
