/**
 * Snake AudioManager — Web Audio API 合成音效，无需任何音频文件。
 * AudioContext 在首次调用时懒加载，规避浏览器 autoplay 限制。
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private visListenerAdded = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      if (!this.visListenerAdded) {
        this.visListenerAdded = true;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this.ctx?.state === 'suspended') {
            void this.ctx.resume();
          }
        });
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /**
   * 播放一段单音合成音。
   * @param startFreq  起始频率 (Hz)
   * @param endFreq    结束频率 (Hz)，线性 ramp
   * @param duration   持续时间 (ms)
   * @param type       振荡器波形
   * @param volume     音量 0–1
   * @param startDelay 相对当前时刻的延迟 (s)，用于多音节连续播放
   */
  private tone(
    startFreq:  number,
    endFreq:    number,
    duration:   number,
    type:       OscillatorType = 'sine',
    volume      = 0.22,
    startDelay  = 0,
  ): void {
    try {
      const ctx  = this.getCtx();
      const t    = ctx.currentTime + startDelay;
      const dur  = duration / 1000;

      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.linearRampToValueAtTime(endFreq, t + dur);

      gain.gain.setValueAtTime(volume, t);
      gain.gain.linearRampToValueAtTime(0, t + dur);

      osc.start(t);
      osc.stop(t + dur + 0.01);
    } catch {
      // AudioContext 不可用时静默跳过
    }
  }

  // ── 公开 SFX ────────────────────────────────────────────────────────────────

  /** 吃到普通食物：短促上扬音 */
  playEat(): void {
    this.tone(440, 660, 75, 'sine', 0.2);
  }

  /** 吃到特殊食物：两个连续上扬音节 */
  playEatSpecial(): void {
    this.tone(440, 550, 75,  'sine', 0.22, 0);
    this.tone(660, 900, 100, 'sine', 0.22, 0.085);
  }

  /** 游戏结束：双层下行音调 */
  playGameOver(): void {
    this.tone(330, 100, 500, 'sawtooth', 0.22, 0);
    this.tone(220,  55, 700, 'sawtooth', 0.14, 0.1);
  }
}
