import { SettingsManager } from './SettingsManager';

export class DialogueSystem {
  private box: HTMLElement;
  private nameEl: HTMLElement;
  private textEl: HTMLElement;
  private active = false;
  private callback: (() => void) | null = null;
  private lines: string[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private timer: number | null = null;

  constructor() {
    this.box = document.getElementById('dialogue-box')!;
    this.nameEl = document.getElementById('dialogue-name')!;
    this.textEl = document.getElementById('dialogue-text')!;
    this.box.onclick = () => this.advance();
    document.addEventListener('keydown', (e) => { if (e.key === 'E' && this.active) this.advance(); });
  }

  show(lines: string[], name: string, _npc?: any, cb?: () => void): void {
    this.lines = lines;
    this.lineIndex = 0;
    this.charIndex = 0;
    this.callback = cb || null;
    this.nameEl.textContent = name;
    this.active = true;
    this.box.style.display = 'block';
    this.typeLine();
  }

  getIsActive(): boolean { return this.active; }

  skipAll(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    this.textEl.textContent = this.lines[this.lines.length - 1] || '';
    this.lineIndex = this.lines.length;
    this.close();
  }

  private typeLine(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    const line = this.lines[this.lineIndex] || '';
    this.charIndex = 0;
    const speed = SettingsManager.get().get().textSpeed;

    const type = () => {
      if (this.charIndex < line.length) {
        this.charIndex++;
        this.textEl.textContent = line.substring(0, this.charIndex);
        this.timer = window.setTimeout(type, speed);
      }
    };
    type();
  }

  private advance(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    const line = this.lines[this.lineIndex] || '';
    if (this.charIndex < line.length) {
      this.charIndex = line.length;
      this.textEl.textContent = line;
      return;
    }
    this.lineIndex++;
    if (this.lineIndex >= this.lines.length) {
      this.close();
      if (this.callback) { const cb = this.callback; this.callback = null; cb(); }
    } else {
      this.typeLine();
    }
  }

  private close(): void {
    this.active = false;
    this.box.style.display = 'none';
  }
}
