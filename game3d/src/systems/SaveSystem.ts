export class SaveSystem {
  static save<T>(key: string, value: T): void {
    try { localStorage.setItem(`bio3d_${key}`, JSON.stringify(value)); } catch {}
  }
  static load<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(`bio3d_${key}`); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
}
