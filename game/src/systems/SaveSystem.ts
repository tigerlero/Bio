const PREFIX = 'bio_explorer_';

export class SaveSystem {
  static save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage full or unavailable
    }
  }

  static load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  }

  static clear(): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    for (const k of keys) localStorage.removeItem(k);
  }
}
