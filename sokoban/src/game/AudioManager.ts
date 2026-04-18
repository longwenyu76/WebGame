/** AudioManager — 预生成 AudioBuffer 方案，彻底避免 iOS 节点累积卡顿
 *
 * 旧方案：每次播放音效都 createOscillator + createGain → connect → start → stop，
 *         几百步后 iOS Safari 的 AudioContext 不堪重负，导致整个页面卡顿。
 *
 * 新方案：初始化时一次性把所有音效和 BGM 旋律渲染成 AudioBuffer（纯采样数据），
 *         播放时只需 createBufferSource().start()，这是 Web Audio 中最轻量的操作，
 *         播完自动释放，iOS 下表现稳定。
 */

import { SettingsManager } from '../utils/SettingsManager';

// ── BGM 旋律 ───────────────────────────────────────────────────────────────────
const BPM = 88;
const q  = 60 / BPM;
const e  = q / 2;
const h  = q * 2;
const dq = q * 1.5;

const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.00, A4 = 440.00;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99;
const R  = 0;

const BGM_MELODY: [number, number][] = [
  [E4, q],  [G4, q],  [A4, q],  [C5, h],
  [A4, q],  [G4, q],  [E4, q],  [D4, h],
  [G4, q],  [A4, q],  [C5, q],  [D5, dq], [C5, e],
  [A4, q],  [G4, q],  [E4, h+q],
  [C5, q],  [D5, q],  [E5, q],  [G5, h],
  [E5, q],  [D5, q],  [C5, q],  [A4, h],
  [G4, q],  [A4, q],  [C5, q],  [A4, q],  [G4, h],
  [E4, q],  [G4, q],  [A4, dq], [G4, e],  [E4, h],
  [R,  q],
];

const SAMPLE_RATE = 44100;

// ── 波形生成工具 ─────────────────────────────────────────────────────────────────

/** 把正弦波采样叠加写入 buf（支持频率滑动 + 指数衰减） */
function renderSine(
  buf: Float32Array, offset: number,
  freq: number, duration: number, gain: number,
  freqEnd?: number,
): void {
  const samples = Math.floor(duration * SAMPLE_RATE);
  for (let i = 0; i < samples; i++) {
    const t = i / SAMPLE_RATE;
    const ratio = i / samples;
    const f = freqEnd !== undefined ? freq + (freqEnd - freq) * ratio : freq;
    const env = gain * Math.exp(-5 * ratio);
    buf[offset + i] += env * Math.sin(2 * Math.PI * f * t);
  }
}

/** 把三角波采样叠加写入 buf */
function renderTriangle(
  buf: Float32Array, offset: number,
  freq: number, duration: number, gain: number,
  freqEnd?: number,
): void {
  const samples = Math.floor(duration * SAMPLE_RATE);
  for (let i = 0; i < samples; i++) {
    const t = i / SAMPLE_RATE;
    const ratio = i / samples;
    const f = freqEnd !== undefined ? freq + (freqEnd - freq) * ratio : freq;
    const env = gain * Math.exp(-5 * ratio);
    buf[offset + i] += env * (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));
  }
}

/** 渲染单个 tone 到 buffer（统一入口） */
function renderTone(
  buf: Float32Array,
  freq: number, duration: number,
  type: 'sine' | 'triangle', gain: number,
  freqEnd?: number, delayMs = 0,
): void {
  const offset = Math.floor((delayMs / 1000) * SAMPLE_RATE);
  if (type === 'triangle') {
    renderTriangle(buf, offset, freq, duration, gain, freqEnd);
  } else {
    renderSine(buf, offset, freq, duration, gain, freqEnd);
  }
}

/** 从 Float32Array 创建 AudioBuffer */
function createBuffer(ctx: AudioContext, data: Float32Array): AudioBuffer {
  const ab = ctx.createBuffer(1, data.length, SAMPLE_RATE);
  ab.getChannelData(0).set(data);
  return ab;
}

// ── SFX 定义 ─────────────────────────────────────────────────────────────────────

interface ToneDef {
  freq: number; dur: number;
  type: 'sine' | 'triangle'; gain: number;
  freqEnd?: number; delayMs?: number;
}

interface SfxDef {
  duration: number;   // buffer 总时长（秒），需容纳所有 tone 含延迟
  tones: ToneDef[];
}

const SFX_DEFS: Record<string, SfxDef> = {
  move: {
    duration: 0.08,
    tones: [{ freq: 220, dur: 0.05, type: 'sine', gain: 0.10, freqEnd: 240 }],
  },
  push: {
    duration: 0.14,
    tones: [
      { freq: 120, dur: 0.08, type: 'triangle', gain: 0.20, freqEnd: 100 },
      { freq: 180, dur: 0.06, type: 'sine',     gain: 0.10, delayMs: 40 },
    ],
  },
  boxOnTarget: {
    duration: 0.22,
    tones: [
      { freq: 660, dur: 0.10, type: 'sine', gain: 0.22, freqEnd: 880 },
      { freq: 880, dur: 0.14, type: 'sine', gain: 0.16, delayMs: 80 },
    ],
  },
  undo: {
    duration: 0.08,
    tones: [{ freq: 320, dur: 0.06, type: 'sine', gain: 0.10, freqEnd: 260 }],
  },
  win: {
    duration: 0.60,
    tones: [523, 659, 784, 1047, 1319].map((f, i) => ({
      freq: f, dur: 0.22, type: 'sine' as const, gain: 0.24, delayMs: i * 90,
    })),
  },
};

// ── AudioManager ─────────────────────────────────────────────────────────────────

export class AudioManager {
  private ctx:     AudioContext | null = null;
  private bgmGain: GainNode    | null = null;
  private sfxGain: GainNode    | null = null;

  // 预生成的 buffer 缓存
  private sfxBuffers: Record<string, AudioBuffer> = {};
  private bgmBuffer:  AudioBuffer | null = null;

  // BGM：只需一个 source 节点循环播放
  private bgmSource:  AudioBufferSourceNode | null = null;
  private bgmRunning: boolean = false;

  private musicVolume:  number;
  private sfxVolume:    number;
  private musicEnabled: boolean;
  private sfxEnabled:   boolean;

  private readonly onVisibilityChange: () => void;

  constructor() {
    const s = SettingsManager.get();
    this.musicVolume  = s.musicVolume;
    this.sfxVolume    = s.sfxVolume;
    this.musicEnabled = s.musicEnabled;
    this.sfxEnabled   = s.sfxEnabled;

    this.onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.ctx?.state === 'suspended') {
        void this.ctx.resume().then(() => {
          if (this.bgmRunning && this.musicEnabled) {
            this.restartBGMSource();
          }
        });
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  // ── 懒初始化：首次播放时创建 AudioContext 并生成所有 buffer ────────────────────

  private ensureReady(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.musicVolume;
        this.bgmGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.ctx.destination);

        this.buildBuffers(this.ctx);
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** 一次性生成所有 SFX + BGM 的 AudioBuffer */
  private buildBuffers(ctx: AudioContext): void {
    // ── SFX buffers ──
    for (const [name, def] of Object.entries(SFX_DEFS)) {
      const len  = Math.ceil(def.duration * SAMPLE_RATE);
      const data = new Float32Array(len);
      for (const t of def.tones) {
        renderTone(data, t.freq, t.dur, t.type, t.gain, t.freqEnd, t.delayMs);
      }
      this.sfxBuffers[name] = createBuffer(ctx, data);
    }

    // ── BGM buffer ──
    const bgmDuration = BGM_MELODY.reduce((s, [, d]) => s + d, 0);
    const bgmLen      = Math.ceil(bgmDuration * SAMPLE_RATE);
    const bgmData     = new Float32Array(bgmLen);
    let offset = 0;
    for (const [freq, dur] of BGM_MELODY) {
      if (freq > 0) {
        const noteDur   = dur * 0.80;
        const sampleOff = Math.floor(offset * SAMPLE_RATE);
        renderSine(bgmData, sampleOff, freq, noteDur, 0.22);
      }
      offset += dur;
    }
    this.bgmBuffer = createBuffer(ctx, bgmData);
  }

  // ── SFX 播放 ─────────────────────────────────────────────────────────────────
  // createBufferSource() 是 Web Audio 中最轻量的操作，
  // 播完自动标记为 finished 并被 GC 回收，不会累积。

  private playSfx(name: string): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureReady();
    if (!ctx || !this.sfxGain) return;
    const buf = this.sfxBuffers[name];
    if (!buf) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.sfxGain);
      src.start();
    } catch { /* ignore */ }
  }

  playMove():        void { this.playSfx('move'); }
  playPush():        void { this.playSfx('push'); }
  playBoxOnTarget(): void { this.playSfx('boxOnTarget'); }
  playUndo():        void { this.playSfx('undo'); }

  playWin(): void {
    this.stopBGM();
    this.playSfx('win');
  }

  // ── BGM 播放（单个 source 节点 + loop）──────────────────────────────────────

  startBGM(): void {
    if (!this.musicEnabled || this.bgmRunning) return;
    this.bgmRunning = true;
    this.restartBGMSource();
  }

  stopBGM(): void {
    this.bgmRunning = false;
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch { /* already stopped */ }
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
  }

  private restartBGMSource(): void {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch { /* */ }
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
    if (!this.bgmRunning) return;
    const ctx = this.ensureReady();
    if (!ctx || !this.bgmGain || !this.bgmBuffer) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = this.bgmBuffer;
      src.loop = true;
      src.connect(this.bgmGain);
      src.start();
      this.bgmSource = src;
    } catch { /* ignore */ }
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

  destroy(): void {
    this.stopBGM();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    void this.ctx?.close();
    this.ctx        = null;
    this.bgmGain    = null;
    this.sfxGain    = null;
    this.sfxBuffers = {};
    this.bgmBuffer  = null;
  }
}
