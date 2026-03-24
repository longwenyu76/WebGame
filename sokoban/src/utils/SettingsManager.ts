const STORAGE_KEY = 'sokoban_settings';

export interface GameSettings {
  musicVolume: number;   // 0.0 ~ 1.0
  sfxVolume:   number;   // 0.0 ~ 1.0
  musicEnabled: boolean;
  sfxEnabled:   boolean;
}

const DEFAULTS: GameSettings = {
  musicVolume:  0.5,
  sfxVolume:    0.7,
  musicEnabled: true,
  sfxEnabled:   true,
};

export const SettingsManager = {
  get(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  },

  save(settings: GameSettings): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  },

  update(partial: Partial<GameSettings>): GameSettings {
    const next = { ...this.get(), ...partial };
    this.save(next);
    return next;
  },
};
