/**
 * AudioManager — Web Audio API 合成音效 + BGM
 * BGM: 合成 Tetris-A (Korobeiniki) 旋律，无需音频文件
 */

import { SettingsManager } from '../utils/SettingsManager';

type OscType = OscillatorType;

// ── BGM 旋律定义 ────────────────────────────────────────────────────────────────
const BPM = 160;
const q  = 60 / BPM;       // 四分音符
const e  = q / 2;           // 八分音符
const h  = q * 2;           // 二分音符
const dq = q * 1.5;         // 附点四分音符

const E5 = 659.25, D5 = 587.33, C5 = 523.25, B4 = 493.88;
const A4 = 440.00, F5 = 698.46, G5 = 783.99, A5 = 880.00;
const R  = 0; // 休止符

// Tetris-A (Korobeiniki) 主旋律: [频率Hz, 时值秒]
const BGM_MELODY: [number, number][] = [
  // Part A — 第 1-2 行
  [E5, q],  [B4, e],  [C5, e],  [D5, q],  [C5, e],  [B4, e],
  [A4, q],  [A4, e],  [C5, e],  [E5, q],  [D5, e],  [C5, e],
  [B4, dq], [C5, e],  [D5, q],  [E5, q],
  [C5, q],  [A4, q],  [A4, h],
  // Part A — 第 3-4 行
  [R,  e],  [D5, q],  [F5, e],  [A5, q],  [G5, e],  [F5, e],
  [E5, dq], [C5, e],  [E5, q],  [D5, e],  [C5, e],
  [B4, q],  [B4, e],  [C5, e],  [D5, q],  [E5, q],
  [C5, q],  [A4, q],  [A4, h],
];

// ── AudioManager ────────────────────────────────────────────────────────────────

export class AudioManager {
  private ctx:     AudioContext | null = null;
  private bgmGain: GainNode    | null = null;
  private sfxGain: GainNode    | null = null;

  private bgmTimers: number[] = [];
  private bgmRunning = false;

  private musicVolume: number;
  private sfxVolume:   number;
  private musicEnabled: boolean;
  private sfxEnabled:   boolean;

  constructor() {
    const s = SettingsManager.get();
    this.musicVolume  = s.musicVolume;
    this.sfxVolume    = s.sfxVolume;
    this.musicEnabled = s.musicEnabled;
    this.sfxEnabled   = s.sfxEnabled;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx?.state === 'suspended') {
        void this.ctx.resume().then(() => {
          // Restart BGM loop if it was running before screen lock
          if (this.bgmRunning && this.musicEnabled) {
            this.stopBGM();
            this.bgmRunning = true;
            this.runBGMLoop();
          }
        });
      }
    });
  }

  // ── 上下文（用户首次交互后激活）──────────────────────────────────────────────

  private getCtx(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.musicVolume;
        this.bgmGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.ctx.destination);
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ── 基础合成：SFX ─────────────────────────────────────────────────────────────

  private beep(
    freq: number,
    duration: number,
    type: OscType = 'square',
    vol = 0.2,
    delay = 0,
  ): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t    = ctx.currentTime + delay;

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // ── BGM ───────────────────────────────────────────────────────────────────────

  private scheduleBGMNote(freq: number, duration: number): void {
    const ctx = this.getCtx();
    if (!ctx || !this.bgmGain) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t    = ctx.currentTime;
    const dur  = duration * 0.82; // 轻微断奏

    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private runBGMLoop(): void {
    if (!this.bgmRunning) return;
    this.bgmTimers = [];

    let offset = 0;
    for (const [freq, dur] of BGM_MELODY) {
      if (freq > 0) {
        const id = window.setTimeout(() => {
          if (this.bgmRunning && this.musicEnabled) {
            this.scheduleBGMNote(freq, dur);
          }
        }, offset * 1000);
        this.bgmTimers.push(id);
      }
      offset += dur;
    }

    // 循环：等全部音符播完后重新开始
    const loopId = window.setTimeout(() => {
      this.runBGMLoop();
    }, offset * 1000);
    this.bgmTimers.push(loopId);
  }

  startBGM(): void {
    if (!this.musicEnabled || this.bgmRunning) return;
    this.bgmRunning = true;
    this.runBGMLoop();
  }

  stopBGM(): void {
    this.bgmRunning = false;
    this.bgmTimers.forEach(id => window.clearTimeout(id));
    this.bgmTimers = [];
  }

  // ── 音效接口 ─────────────────────────────────────────────────────────────────

  playMove(): void {
    this.beep(180, 0.04, 'square', 0.12);
  }

  playRotate(): void {
    this.beep(380, 0.07, 'sine', 0.18);
  }

  playHardDrop(): void {
    // 低频撞击音：两层叠加
    this.beep(90,  0.10, 'sawtooth', 0.35);
    this.beep(55,  0.14, 'sawtooth', 0.22, 0.05);
  }

  playClear(lines: number): void {
    if (lines >= 4) {
      // Tetris！四级琶音 + 高频闪光
      [523, 659, 784, 1047].forEach((f, i) =>
        this.beep(f, 0.22, 'sine', 0.5, i * 0.06)
      );
      this.beep(1568, 0.32, 'sine', 0.28, 0.24);
    } else if (lines === 3) {
      // 三行：三级琶音 + 补充高音
      [523, 659, 784].forEach((f, i) =>
        this.beep(f, 0.18, 'sine', 0.42, i * 0.07)
      );
      this.beep(1047, 0.22, 'sine', 0.22, 0.21);
    } else if (lines === 2) {
      // 两行：双音和弦上行
      [440, 554, 659].forEach((f, i) =>
        this.beep(f, 0.15, 'sine', 0.35, i * 0.07)
      );
    } else {
      // 一行：简单两音上行
      this.beep(440, 0.08, 'sine', 0.25);
      this.beep(554, 0.10, 'sine', 0.22, 0.09);
    }
  }

  playGameOver(): void {
    this.stopBGM();
    [330, 262, 220, 165].forEach((f, i) =>
      this.beep(f, 0.35, 'sawtooth', 0.3, i * 0.22)
    );
  }

  // ── 设置接口 ─────────────────────────────────────────────────────────────────

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.bgmGain) this.bgmGain.gain.value = this.musicVolume;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) this.stopBGM();
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  applySettings(): void {
    const s = SettingsManager.get();
    this.setMusicVolume(s.musicVolume);   // 直接更新 GainNode，立即生效
    this.setSfxVolume(s.sfxVolume);
    this.setSfxEnabled(s.sfxEnabled);
    // 音乐开关：关闭时停止BGM，开启时（若BGM未在播）重新启动
    if (!s.musicEnabled) {
      this.setMusicEnabled(false);        // stops BGM
    } else if (s.musicEnabled && !this.bgmRunning) {
      this.musicEnabled = true;
      this.startBGM();                    // restart from top
    }
  }

  getMusicVolume(): number  { return this.musicVolume; }
  getSfxVolume():   number  { return this.sfxVolume; }
  isMusicEnabled(): boolean { return this.musicEnabled; }
  isSfxEnabled():   boolean { return this.sfxEnabled; }

  // 兼容旧接口
  toggleMute(): boolean {
    const wasMuted = !this.musicEnabled && !this.sfxEnabled;
    this.setMusicEnabled(wasMuted);
    this.setSfxEnabled(wasMuted);
    return !wasMuted;
  }

  isMuted(): boolean { return !this.musicEnabled && !this.sfxEnabled; }
}
