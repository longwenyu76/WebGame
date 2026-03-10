/** AudioManager — Web Audio API synthesis, no audio files needed. */
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
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number, duration: number,
    type: OscillatorType = 'sine', gain = 0.18, freqEnd?: number, delayMs = 0,
  ): void {
    try {
      const ctx  = this.getCtx();
      const t0   = ctx.currentTime + delayMs / 1000;
      const osc  = ctx.createOscillator();
      const g    = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0); osc.stop(t0 + duration + 0.01);
    } catch { /* blocked */ }
  }

  /** Slide / move tiles */
  playMove(): void { this.tone(280, 0.06, 'sine', 0.12, 320); }

  /** Two tiles merged */
  playMerge(): void {
    this.tone(420, 0.08, 'sine', 0.20, 560);
    this.tone(560, 0.10, 'sine', 0.12, undefined, 60);
  }

  /** Achieved 2048 */
  playWin(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.tone(f, 0.22, 'sine', 0.26, undefined, i * 100)
    );
  }

  /** Game over — no more moves */
  playGameOver(): void {
    [440, 370, 311, 261].forEach((f, i) =>
      this.tone(f, 0.28, 'sawtooth', 0.18, undefined, i * 180)
    );
  }
}
