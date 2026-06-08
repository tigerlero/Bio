import Phaser from 'phaser';
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';

export class PauseMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private isOpen = false;
  private buttons: { text: Phaser.GameObjects.Text; action: () => void }[] = [];
  private selectedIndex = 0;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    this.container = scene.add.container(0, 0).setDepth(500).setVisible(false);

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRect(0, 0, width, height);
    this.container.add(this.bg);

    const cx = width / 2;
    const cy = height / 2 - 40;

    this.container.add(
      scene.add.text(cx, cy - 80, 'PAUSED', {
        fontSize: '36px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );

    const options: { label: string; fn: () => void }[] = [
      { label: 'Resume', fn: () => this.close() },
      { label: 'Toggle High Contrast', fn: () => {
        const hc = SettingsManager.get().toggleHighContrast();
        this.updateHighContrastText();
      }},
      { label: 'Save', fn: () => {
        SaveSystem.save('player_x', (this.scene as any).player?.x ?? 0);
        SaveSystem.save('player_y', (this.scene as any).player?.y ?? 0);
        AudioManager.get().playSfx('interact');
      }},
      { label: 'Quit to Title', fn: () => {
        AudioManager.get().stopBgm(0.3);
        this.scene.scene.start('TitleScene');
      }},
      { label: 'Exit to Website', fn: () => {
        window.location.href = window.location.origin;
      }},
    ];

    this.keyUp = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyEnter = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    options.forEach((opt, i) => {
      const y = cy + i * 36;
      const txt = scene.add.text(cx, y, opt.label, {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => { this.selectedIndex = i; this.renderSelection(); });
      txt.on('pointerdown', () => { this.selectedIndex = i; opt.fn(); });
      this.container.add(txt);
      this.buttons.push({ text: txt, action: opt.fn });
    });
  }

  private updateHighContrastText(): void {
    const hc = SettingsManager.get().get().highContrast;
    this.buttons[1].text.setText(hc ? 'Disable High Contrast' : 'Toggle High Contrast');
  }

  private renderSelection(): void {
    this.buttons.forEach((b, i) => {
      b.text.setColor(i === this.selectedIndex ? '#ffffff' : '#aaaaaa');
      b.text.setFontSize(i === this.selectedIndex ? '22px' : '20px');
    });
  }

  open(): void {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.renderSelection();
    this.updateHighContrastText();
    this.container.setVisible(true);
  }

  close(): void {
    this.isOpen = false;
    this.container.setVisible(false);
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  update(): void {
    if (!this.isOpen) return;

    if (Phaser.Input.Keyboard.JustDown(this.keyUp)) {
      this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
      AudioManager.get().playSfx('hover');
      this.renderSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyDown)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
      AudioManager.get().playSfx('hover');
      this.renderSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
      AudioManager.get().playSfx('interact');
      this.buttons[this.selectedIndex].action();
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
