import Phaser from 'phaser';
import { SCENE_KEYS, CANVAS_WIDTH, FONT_FAMILY } from '../constants/GameConstants';
import { SettingsManager, GameSettings } from '../utils/SettingsManager';

const PAD  = { top: 6, bottom: 4, left: 4, right: 4 };
const CX   = CANVAS_WIDTH / 2;
const FONT = FONT_FAMILY;

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.SETTINGS });
  }

  create(data?: { from?: string }): void {
    const fromGame = data?.from === 'game';
    const s = SettingsManager.get();

    // 背景面板
    this.add.rectangle(CX, 320, 380, 480, 0x0d0d1a, 0.98)
      .setStrokeStyle(1, 0x333366);

    this.add.text(CX, 110, '设  置', {
      fontSize: '32px', color: '#00f0f0', fontStyle: 'bold', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);

    let y = 175;

    // 通知正在运行的 GameScene 立即应用新设置
    const notifyGame = () => {
      if (!fromGame) return;
      const g = this.scene.get(SCENE_KEYS.GAME);
      if (g) (g as unknown as { applySettings: () => void }).applySettings?.();
    };

    // ── 工具函数 ─────────────────────────────────────────────────────────────────

    const makeToggle = (
      label: string,
      getVal: () => boolean,
      setter: (v: boolean) => void,
    ): void => {
      this.add.text(CX - 90, y, label, {
        fontSize: '18px', color: '#aaaacc', padding: PAD, fontFamily: FONT,
      }).setOrigin(0, 0.5);

      const btn = this.add.text(CX + 80, y, '', {
        fontSize: '18px', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const refresh = () => {
        const on = getVal();
        btn.setText(on ? '[ 开启 ]' : '[ 关闭 ]');
        btn.setColor(on ? '#44ee88' : '#ee4444');
      };
      refresh();

      btn.on('pointerdown', () => {
        setter(!getVal());
        refresh();
        notifyGame();
      });

      y += 48;
    };

    const makeVolume = (
      label: string,
      key: keyof GameSettings,
    ): void => {
      this.add.text(CX - 90, y, label, {
        fontSize: '18px', color: '#aaaacc', padding: PAD, fontFamily: FONT,
      }).setOrigin(0, 0.5);

      const valText = this.add.text(CX + 80, y, '', {
        fontSize: '18px', color: '#ffffff', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5);

      const refreshVol = () => {
        const v = SettingsManager.get()[key] as number;
        valText.setText(`${Math.round(v * 100)}%`);
      };
      refreshVol();

      const minus = this.add.text(CX + 40, y, '[-]', {
        fontSize: '18px', color: '#aaaaff', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const plus = this.add.text(CX + 120, y, '[+]', {
        fontSize: '18px', color: '#aaaaff', padding: PAD, fontFamily: FONT,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const step = (delta: number) => {
        const cur = SettingsManager.get()[key] as number;
        SettingsManager.update({ [key]: Math.max(0, Math.min(1, cur + delta)) });
        refreshVol();
        notifyGame();
      };

      minus.on('pointerdown', () => step(-0.1));
      plus.on('pointerdown',  () => step(0.1));

      y += 48;
    };

    // ── 设置项 ───────────────────────────────────────────────────────────────────

    // 当前设置引用（通过 SettingsManager.get() 每次取最新值）
    makeToggle(
      '背景音乐',
      () => SettingsManager.get().musicEnabled,
      (v) => SettingsManager.update({ musicEnabled: v }),
    );

    makeVolume('音乐音量', 'musicVolume');

    makeToggle(
      '音效',
      () => SettingsManager.get().sfxEnabled,
      (v) => SettingsManager.update({ sfxEnabled: v }),
    );

    makeVolume('音效音量', 'sfxVolume');

    // ── 难度 ─────────────────────────────────────────────────────────────────────

    this.add.text(CX - 90, y, '难度模式', {
      fontSize: '18px', color: '#aaaacc', padding: PAD, fontFamily: FONT,
    }).setOrigin(0, 0.5);

    const diffBtn = this.add.text(CX + 80, y, '', {
      fontSize: '18px', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const refreshDiff = () => {
      const d = SettingsManager.get().difficulty;
      if (d === 'hard') {
        diffBtn.setText('[ 困难 ]');
        diffBtn.setColor('#ff8844');
      } else {
        diffBtn.setText('[ 普通 ]');
        diffBtn.setColor('#44ee88');
      }
    };
    refreshDiff();

    diffBtn.on('pointerdown', () => {
      const cur = SettingsManager.get().difficulty;
      SettingsManager.update({ difficulty: cur === 'normal' ? 'hard' : 'normal' });
      refreshDiff();
      notifyGame();
    });

    y += 48;

    // ── 返回按钮 ─────────────────────────────────────────────────────────────────

    const backLabel = fromGame ? '[ 返回游戏 ]' : '[ 返回主页 ]';
    const backBtn = this.add.text(CX, y + 20, backLabel, {
      fontSize: '24px', color: '#00f0f0', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setAlpha(0.7));
    backBtn.on('pointerout',  () => backBtn.setAlpha(1));
    backBtn.on('pointerdown', () => {
      if (fromGame) {
        this.scene.stop();
        this.scene.launch(SCENE_KEYS.PAUSE);
      } else {
        this.scene.start(SCENE_KEYS.MENU);
      }
    });

    // 提示文字
    this.add.text(CX, y + 72, '点击难度/开关切换，点击[-][+]调整音量', {
      fontSize: '12px', color: '#555577', padding: PAD, fontFamily: FONT,
    }).setOrigin(0.5);
  }
}
