import Phaser from 'phaser';
import { loadBio, getBio } from '../data/bioLoader';
import type { Project } from '../data/bio';
import { ModalPanel } from '../ui/ModalPanel';
import { AudioManager } from '../systems/AudioManager';

export class ProjectGalleryScene extends Phaser.Scene {
  private bio = loadBio();
  private projectCards: { card: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; techTags: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Text; data: Project }[] = [];
  private scrollY = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private maxScroll = 0;
  private isDown = false;
  private lastY = 0;

  constructor() {
    super({ key: 'ProjectGalleryScene' });
  }

  create(): void {
    this.bio = getBio();
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1628, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 20, 'Project Gallery', {
      fontSize: '28px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.contentContainer = this.add.container(0, 0);

    const cardW = width * 0.8;
    const cardH = 80;
    const startY = 60;
    const gap = 12;

    this.projectCards = [];

    this.bio.projects.forEach((p, i) => {
      const cy = startY + i * (cardH + gap);
      const card = this.add.graphics();
      card.fillStyle(0x1a1a3e, 0.9);
      card.fillRoundedRect(width * 0.1, cy, cardW, cardH, 8);
      card.lineStyle(1, 0x4488ff, 0.4);
      card.strokeRoundedRect(width * 0.1, cy, cardW, cardH, 8);

      const label = this.add.text(width * 0.1 + 12, cy + 10, p.title, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
      });

      const techs = p.tech.slice(0, 5).join(', ');
      const techText = this.add.text(width * 0.1 + 12, cy + 34, techs, {
        fontSize: '12px', color: '#88aaff', fontFamily: 'monospace',
      });

      const btn = this.add.text(width * 0.9 - 70, cy + cardH / 2, 'View →', {
        fontSize: '14px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        AudioManager.get().playSfx('interact');
        this.openModal(p);
      });

      this.contentContainer.add([card, label, techText, btn]);
      this.projectCards.push({ card, label, techTags: techText, btn, data: p });
    });

    this.maxScroll = Math.max(0, startY + this.bio.projects.length * (cardH + gap) - height + 40);

    // Scroll input
    this.input.on('wheel', (_p: unknown, _gx: unknown, _gy: unknown, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, -this.maxScroll, 0);
      this.contentContainer.setY(this.scrollY);
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.isDown = true;
      this.lastY = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDown) return;
      const dy = p.y - this.lastY;
      this.lastY = p.y;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, -this.maxScroll, 0);
      this.contentContainer.setY(this.scrollY);
    });
    this.input.on('pointerup', () => { this.isDown = false; });

    // Return button
    const ret = this.add.text(width / 2, height - 20, '← Return to World', {
      fontSize: '16px', color: '#44cc44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    ret.on('pointerdown', () => this.returnToWorld());
    this.input.keyboard?.on('keydown-ESC', () => this.returnToWorld());
  }

  private modal: ModalPanel | null = null;
  private openModal(p: Project): void {
    if (!this.modal) this.modal = new ModalPanel(this);
    const desc = p.description ? `#Description\n${p.description}` : '';
    const techs = `#Technologies\n${p.tech.join(', ')}`;
    const link = p.link ? `#Link\n${p.link}` : '';
    this.modal.show(`${desc}\n${techs}\n${link}`);
  }

  private returnToWorld(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('OverworldScene');
    });
  }
}
