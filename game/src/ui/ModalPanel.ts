import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

export class ModalPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private closeBtn: Phaser.GameObjects.Text;
  private content: Phaser.GameObjects.Container;
  private isOpen: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.graphics();
    this.content = scene.add.container(0, 0);
    this.closeBtn = scene.add.text(0, 0, '✕', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#cc3333',
      padding: { x: 6, y: 2 },
    });
    this.closeBtn.setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.close());

    this.container = scene.add.container(0, 0, [this.bg, this.content, this.closeBtn]);
    this.container.setDepth(100);
    this.container.setVisible(false);
  }

  show(html: string): void {
    AudioManager.get().playSfx('modalOpen');
    const { width, height } = this.scene.scale;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRect(0, 0, width, height);
    this.bg.fillStyle(0x1a1a2e, 1);
    this.bg.fillRoundedRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8, 12);

    this.content.removeAll(true);
    const lines = html.split('\n').filter((l) => l.trim());
    let yOff = height * 0.15;

    for (const line of lines) {
      const isHeader = line.startsWith('#');
      const cleaned = line.replace(/^#+\s*/, '');
      const txt = this.scene.add.text(width * 0.15, yOff, cleaned, {
        fontSize: isHeader ? '22px' : '16px',
        color: isHeader ? '#ffdd44' : '#ffffff',
        wordWrap: { width: width * 0.7 },
      });
      txt.setOrigin(0, 0);
      this.content.add(txt);
      yOff += isHeader ? 40 : 28;
    }

    this.closeBtn.setPosition(width * 0.85 - 20, height * 0.12);
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
    this.isOpen = true;
  }

  close(): void {
    AudioManager.get().playSfx('modalClose');
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.container.setVisible(false);
        this.isOpen = false;
      },
    });
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }
}
