import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';
import { SettingsManager } from '../systems/SettingsManager';

type SceneStarter = (key: string) => void;

export class PauseMenu {
  private container: HTMLElement;
  private content: HTMLElement;
  private isOpen = false;
  private buttons: { el: HTMLElement; fn: () => void }[] = [];
  private selectedIndex = 0;
  private onSceneStart: SceneStarter;

  constructor(onSceneStart: SceneStarter) {
    this.onSceneStart = onSceneStart;
    this.container = document.getElementById('pause-menu')!;
    this.content = document.getElementById('pause-content')!;

    const options = [
      { label: 'Resume', fn: () => this.close() },
      { label: 'Toggle High Contrast', fn: () => {
        SettingsManager.get().toggleHighContrast();
        this.updateLabels();
      }},
      { label: 'Save', fn: () => {
        AudioManager.get().playSfx('interact');
      }},
      { label: 'Quit to Title', fn: () => {
        AudioManager.get().stopBgm(0.3);
        this.close();
        this.onSceneStart('TitleScene');
      }},
      { label: 'Exit to Website', fn: () => {
        window.location.href = '../';
      }},
    ];

    options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'pause-btn';
      btn.textContent = opt.label;
      btn.onclick = () => { this.selectedIndex = i; this.render(); opt.fn(); };
      btn.onmouseenter = () => { this.selectedIndex = i; this.render(); };
      this.content.appendChild(btn);
      this.buttons.push({ el: btn, fn: opt.fn });
    });

    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length; AudioManager.get().playSfx('hover'); this.render(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length; AudioManager.get().playSfx('hover'); this.render(); }
      if (e.key === 'Enter') { e.preventDefault(); AudioManager.get().playSfx('interact'); this.buttons[this.selectedIndex].fn(); }
    });
  }

  private updateLabels(): void {
    this.buttons[1].el.textContent = SettingsManager.get().get().highContrast ? 'Disable High Contrast' : 'Toggle High Contrast';
  }

  private render(): void {
    this.buttons.forEach((b, i) => {
      b.el.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  open(): void {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.updateLabels();
    this.render();
    this.container.style.display = 'block';
  }

  close(): void {
    this.isOpen = false;
    this.container.style.display = 'none';
  }

  getIsOpen(): boolean { return this.isOpen; }

  destroy(): void {
    this.buttons.forEach(b => b.el.remove());
  }
}
