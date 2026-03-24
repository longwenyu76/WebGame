/** AudioManager — Web Audio API 合成音效 + BGM，无需音频文件 */

import { SettingsManager } from '../utils/SettingsManager';

// ── BGM 旋律（舒缓五声音阶，适合益智游戏）──────────────────────────────────
const BPM = 88;
const q  = 60 / BPM;
const e  = q / 2;
const h  = q * 2;
const dq = q * 1.5;

const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.00, A4 = 440.00;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99;
const R  = 0;

const BGM_MELODY: [number, number][] = [
  // Phrase 1
  [E4, q],  [G4, q],  [A4, q],  [C5, h],
  [A4, q],  [G4, q],  [E4, q],  [D4, h],
  // Phrase 2
  [G4, q],  [A4, q],  [C5, q],  [D5, dq], [C5, e],
  [A4, q],  [G4, q],  [E4, h+q],
  // Phrase 3
  [C5, q],  [D5, q],  [E5, q],  [G5, h],
  [E5, q],  [D5, q],  [C5, q],  [A4, h],
  // Phrase 4
  [G4, q],  [A4, q],  [C5, q],  [A4, q],  [G4, h],
  [E4, q],  [G4, q],  [A4, dq], [G4, e],  [E4, h],
  [R,  q],
];

// ── AudioManager ──────────────────────────────────────────────────────────────
export class AudioManager {
  private ctx:     AudioContext | null = null;
  private bgmGain: GainNode    | null = null;
  private sfxGain: GainNode    | null = null;

  private bgmTimers:  number[]  = [];
  private bgmRunning: boolean   = false;

  private musicVolume:  number;
  private sfxVolume:    number;
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
          if (this.bgmRunning && this.musicEnabled) {
            this.stopBGM();
            this.bgmRunning = true;
            this.runBGMLoop();
          }
        });
      }
    });
  }

  // ── AudioContext ────────────────────────────────────────────────────────────

  private getCtx(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.musicVolume;
        this.bgmGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.ctx.destination);
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  // ── SFX 基础合成 ───────────────────────────────────────────────────────────

  private tone(
    freq: number, duration: number,
    type: OscillatorType = 'sine', gain = 0.15, freqEnd?: number, delayMs = 0,
  ): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    try {
      const t0  = ctx.currentTime + delayMs / 1000;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(this.sfxGain);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0); osc.stop(t0 + duration + 0.01);
    } catch { /* 被浏览器策略阻止时静默忽略 */ }
  }

  // ── BGM ────────────────────────────────────────────────────────────────────

  private scheduleBGMNote(freq: number, duration: number): void {
    const ctx = this.getCtx();
    if (!ctx || !this.bgmGain) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const t    = ctx.currentTime;
      const dur  = duration * 0.80;

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    } catch { /* ignore */ }
  }

  private runBGMLoop(): void {
    if (!this.bgmRunning) return;
    this.bgmTimers = [];

    let offset = 0;
    for (const [freq, dur] of BGM_MELODY) {
      if (freq > 0) {
        const id = window.setTimeout(() => {
          if (this.bgmRunning && this.musicEnabled) this.scheduleBGMNote(freq, dur);
        }, offset * 1000);
        this.bgmTimers.push(id);
      }
      offset += dur;
    }

    const loopId = window.setTimeout(() => { this.runBGMLoop(); }, offset * 1000);
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

  // ── SFX 接口 ───────────────────────────────────────────────────────────────

  /** 玩家移动（轻柔步伐声） */
  playMove(): void {
    this.tone(220, 0.05, 'sine', 0.10, 240);
  }

  /** 推动箱子（沉重推动声） */
  playPush(): void {
    this.tone(120, 0.08, 'triangle', 0.20, 100);
    this.tone(180, 0.06, 'sine',     0.10, undefined, 40);
  }

  /** 箱子到达目标点（叮咚声） */
  playBoxOnTarget(): void {
    this.tone(660, 0.10, 'sine', 0.22, 880);
    this.tone(880, 0.14, 'sine', 0.16, undefined, 80);
  }

  /** 撤销（轻微回退音） */
  playUndo(): void {
    this.tone(320, 0.06, 'sine', 0.10, 260);
  }

  /** 关卡完成（胜利音乐） */
  playWin(): void {
    this.stopBGM();
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.tone(f, 0.22, 'sine', 0.24, undefined, i * 90)
    );
  }

  // ── 设置接口 ───────────────────────────────────────────────────────────────

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

  setSfxEnabled(enabled: boolean): void { this.sfxEnabled = enabled; }

  applySettings(): void {
    const s = SettingsManager.get();
    this.setMusicVolume(s.musicVolume);
    this.setSfxVolume(s.sfxVolume);
    this.setSfxEnabled(s.sfxEnabled);
    if (!s.musicEnabled) {
      this.setMusicEnabled(false);
    } else if (s.musicEnabled && !this.bgmRunning) {
      this.musicEnabled = true;
      this.startBGM();
    }
  }
}
