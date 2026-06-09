interface Settings { highContrast: boolean; textSpeed: number; }

export class SettingsManager {
  private static _instance: SettingsManager;
  private settings: Settings;

  private constructor() {
    this.settings = this.load();
  }

  static get(): SettingsManager {
    if (!this._instance) this._instance = new SettingsManager();
    return this._instance;
  }

  private load(): Settings {
    try {
      const v = localStorage.getItem('bio3d_settings');
      if (v) return JSON.parse(v);
    } catch {}
    return { highContrast: false, textSpeed: 30 };
  }

  private save(): void {
    try { localStorage.setItem('bio3d_settings', JSON.stringify(this.settings)); } catch {}
  }

  get(): Settings { return this.settings; }

  toggleHighContrast(): boolean {
    this.settings.highContrast = !this.settings.highContrast;
    this.save();
    document.documentElement.classList.toggle('high-contrast', this.settings.highContrast);
    return this.settings.highContrast;
  }

  setTextSpeed(speed: number): void {
    this.settings.textSpeed = speed;
    this.save();
  }
}
