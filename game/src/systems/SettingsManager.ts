export interface GameSettings {
  highContrast: boolean;
  textSpeed: number;
}

const STORAGE_KEY = 'bio_game_settings';
const DEFAULTS: GameSettings = {
  highContrast: false,
  textSpeed: 30,
};

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: GameSettings;

  private constructor() {
    this.settings = this.load();
  }

  static get(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  get(): GameSettings {
    return { ...this.settings };
  }

  set(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.save();
    this.apply();
  }

  toggleHighContrast(): boolean {
    this.settings.highContrast = !this.settings.highContrast;
    this.save();
    this.apply();
    return this.settings.highContrast;
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch { /* storage full or unavailable */ }
  }

  private apply(): void {
    document.body.classList.toggle('bio-high-contrast', this.settings.highContrast);
  }
}
