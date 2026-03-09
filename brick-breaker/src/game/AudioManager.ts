/**
 * AudioManager — Web Audio API synthesis (no audio files needed).
 * All sounds are generated procedurally.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  // ── Core helper ────────────────────────────────────────────────────────────
  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainPeak = 0.25,
    freqEnd?: number,
    delayMs = 0,
  ): void {
    try {
      const ctx  = this.getCtx();
      const t0   = ctx.currentTime + delayMs / 1000;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
      }
      gain.gain.setValueAtTime(gainPeak, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0);
      osc.stop(t0 + duration + 0.01);
    } catch { /* AudioContext blocked — ignore */ }
  }

  // ── Game sounds ────────────────────────────────────────────────────────────

  /** Ball bounces off a side/top wall. */
  playWallHit(): void {
    this.tone(900, 0.04, 'square', 0.12, 700);
  }

  /** Ball bounces off the paddle. */
  playPaddleHit(): void {
    this.tone(480, 0.07, 'sine', 0.28, 560);
  }

  /** A brick is hit but not destroyed. */
  playBrickHit(): void {
    this.tone(320, 0.09, 'square', 0.18, 200);
  }

  /** A brick is destroyed. Higher-HP bricks → lower, grittier sound. */
  playBrickDestroy(maxHp: number): void {
    const freq = maxHp >= 3 ? 180 : maxHp === 2 ? 260 : 360;
    this.tone(freq, 0.14, 'sawtooth', 0.26, freq * 0.45);
  }

  /** Fire ball hits/passes through a brick — short crackle. */
  playFireBrickHit(): void {
    this.tone(180, 0.06, 'sawtooth', 0.2, 90);
  }

  /** A power-up capsule is collected. */
  playPowerupCollect(type: string): void {
    if (type === 'extra_life') {
      // Festive ascending arpeggio
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((f, i) => this.tone(f, 0.18, 'sine', 0.28, undefined, i * 75));
    } else if (type === 'fire_ball') {
      // Dramatic rising sweep
      this.tone(200, 0.22, 'sawtooth', 0.22, 600);
    } else {
      // Simple two-note chime
      this.tone(660, 0.10, 'sine', 0.22);
      this.tone(880, 0.14, 'sine', 0.18, undefined, 70);
    }
  }

  /** All destroyable bricks cleared — level complete. */
  playLevelClear(): void {
    const notes = [523, 659, 784, 1047, 1319]; // C E G C E (major arpeggio)
    notes.forEach((f, i) => this.tone(f, 0.20, 'sine', 0.28, undefined, i * 90));
  }

  /** Player has lost their last life. */
  playGameOver(): void {
    const notes = [440, 370, 311, 261]; // descending minor
    notes.forEach((f, i) => this.tone(f, 0.30, 'sawtooth', 0.22, undefined, i * 190));
  }

  /** Ball lost (but lives remain) — short descending blip. */
  playLifeLost(): void {
    this.tone(440, 0.08, 'sine', 0.22);
    this.tone(280, 0.18, 'sine', 0.18, undefined, 70);
  }
}
