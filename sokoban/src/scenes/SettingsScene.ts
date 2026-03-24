import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, CANVAS_HEIGHT, FONT_FAMILY } from '../constants/GameConstants';
import { SettingsManager, GameSettings } from '../utils/SettingsManager';

const PAD  = { top: 6, bottom: 4, left: 4, right: 4 };
const CX   = CANVAS_WIDTH / 2;
const FONT = FONT_FAMILY;

export class SettingsScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.SETTINGS }); }

  create(data?: { from?: string }): void {
    const fromGame = data?.from === 'game';

    this.add.rectangle(CX, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x0d0d1a, 0.98);
    this.add.rectangle(CX, CANVAS_HEIGHT / 2, 380, 420, 0x1a1a3a, 0.99)
      .setStrokeStyle(1, 0x445566);

    this.add.text(CX, 130, '设  置', {
      fontSize: '32px', color: '#f39c12', fontStyle: 'bold', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);

    let y = 210;

    const notifyGame = () => {
      if (!fromGame) return;
      const g = this.scene.get(SCENE_KEYS.GAME);
      if (g) (g as unknown as { applySettings: () => void }).applySettings?.();
    };

    // ── 工具函数 ────────────────────────────────────────────────────────────────

    const makeToggle = (
      label: string,
      getVal: () => boolean,
      setter: (v: boolean) => void,
    ): void => {
      this.add.text(CX - 100, y, label, {
        fontSize: '18px', color: '#aaaacc', padding: PAD, fontFamily: FONT,
      }).setOrigin(0, 0.5);

      const btn = this.add.text(CX + 90, y, '', {
        fontSize: '18px', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const refresh = () => {
        const on = getVal();
        btn.setText(on ? '[ 开启 ]' : '[ 关闭 ]');
        btn.setColor(on ? '#44ee88' : '#ee4444');
      };
      refresh();

      btn.on('pointerdown', () => { setter(!getVal()); refresh(); notifyGame(); });
      y += 52;
    };

    const makeVolume = (label: string, key: keyof GameSettings): void => {
      this.add.text(CX - 100, y, label, {
        fontSize: '18px', color: '#aaaacc', padding: PAD, fontFamily: FONT,
      }).setOrigin(0, 0.5);

      const valText = this.add.text(CX + 90, y, '', {
        fontSize: '18px', color: '#ffffff', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5);

      const refreshVol = () => {
        const v = SettingsManager.get()[key] as number;
        valText.setText(`${Math.round(v * 100)}%`);
      };
      refreshVol();

      const minus = this.add.text(CX + 46, y, '[-]', {
        fontSize: '18px', color: '#aaaaff', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const plus = this.add.text(CX + 130, y, '[+]', {
        fontSize: '18px', color: '#aaaaff', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const step = (delta: number) => {
        const cur = SettingsManager.get()[key] as number;
        SettingsManager.update({ [key]: Math.max(0, Math.min(1, Math.round((cur + delta) * 10) / 10)) });
        refreshVol();
        notifyGame();
      };

      minus.on('pointerdown', () => step(-0.1));
      plus.on('pointerdown',  () => step(0.1));
      y += 52;
    };

    // ── 设置项 ──────────────────────────────────────────────────────────────────

    makeToggle(
      '背景音乐',
      () => SettingsManager.get().musicEnabled,
      (v) => SettingsManager.update({ musicEnabled: v }),
    );
    makeVolume('音乐音量', 'musicVolume');

    makeToggle(
      '音  效',
      () => SettingsManager.get().sfxEnabled,
      (v) => SettingsManager.update({ sfxEnabled: v }),
    );
    makeVolume('音效音量', 'sfxVolume');

    // ── 返回按钮 ────────────────────────────────────────────────────────────────

    const backLabel = fromGame ? '← 返回游戏' : '← 返回主页';
    const backY2 = y + 16;
    this.add.rectangle(CX + 3, backY2 + 5, 200, 44, 0x0c0e16).setOrigin(0.5);
    const backBg = this.add.rectangle(CX, backY2, 200, 44, 0x4a5568).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const backBtn = this.add.text(CX, backY2, backLabel, {
      fontSize: '20px', color: '#f39c12', fontFamily: FONT,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.add.rectangle(CX, backY2 - 20, 192, 3, 0x7a9ab5).setOrigin(0.5, 0);
    this.add.rectangle(CX, backY2 + 17, 192, 3, 0x1e2d3d).setOrigin(0.5, 0);
    backBg.on('pointerover', () => backBg.setFillStyle(0x718096));
    backBg.on('pointerout',  () => backBg.setFillStyle(0x4a5568));
    backBg.on('pointerdown', () => {
      if (fromGame) { this.scene.resume(SCENE_KEYS.GAME); this.scene.stop(); }
      else { this.scene.start(SCENE_KEYS.MENU); }
    });
    backBtn.on('pointerdown', () => {
      if (fromGame) {
        this.scene.resume(SCENE_KEYS.GAME);
        this.scene.stop();
      } else {
        this.scene.start(SCENE_KEYS.MENU);
      }
    });

    this.add.text(CX, CANVAS_HEIGHT - 30, '点击开关切换，点击 [-][+] 调整音量', {
      fontSize: '12px', color: '#445566', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);
  }
}
