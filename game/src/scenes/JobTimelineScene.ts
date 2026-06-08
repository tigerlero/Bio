import Phaser from 'phaser';
import { loadBio, getBio } from '../data/bioLoader';
import type { Job } from '../data/bio';
import { ModalPanel } from '../ui/ModalPanel';
import { AudioManager } from '../systems/AudioManager';

export class JobTimelineScene extends Phaser.Scene {
  private bio = loadBio();
  private scrollY = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private maxScroll = 0;
  private isDown = false;
  private lastY = 0;

  constructor() {
    super({ key: 'JobTimelineScene' });
  }

  create(): void {
    this.bio = getBio();
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1a0a, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 20, 'Career Timeline', {
      fontSize: '28px', color: '#44cc44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.contentContainer = this.add.container(0, 0);

    const startY = 60;
    const lineX = width * 0.25;

    // Vertical timeline line
    const timelineLine = this.add.graphics();
    timelineLine.lineStyle(3, 0x44cc44, 0.3);
    timelineLine.beginPath();
    timelineLine.moveTo(lineX, startY);
    timelineLine.lineTo(lineX, startY + this.bio.jobs.length * 120 + 40);
    timelineLine.strokePath();
    this.contentContainer.add(timelineLine);

    this.bio.jobs.forEach((j, i) => {
      const cy = startY + i * 120;

      // Circle node on timeline
      const node = this.add.graphics();
      node.fillStyle(0x44cc44, 0.7);
      node.fillCircle(lineX, cy + 40, 10);
      this.contentContainer.add(node);

      // Content card
      const cardX = lineX + 24;
      const cardW = width * 0.65;
      const card = this.add.graphics();
      card.fillStyle(0x1a2e1a, 0.9);
      card.fillRoundedRect(cardX, cy, cardW, 90, 8);
      card.lineStyle(1, 0x44cc44, 0.3);
      card.strokeRoundedRect(cardX, cy, cardW, 90, 8);

      const company = this.add.text(cardX + 12, cy + 8, j.company, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      });

      const role = this.add.text(cardX + 12, cy + 34, `${j.role} | ${j.period}`, {
        fontSize: '13px', color: '#88dd88', fontFamily: 'monospace',
      });

      const highlights = j.highlights.slice(0, 2).join(' • ');
      const hl = this.add.text(cardX + 12, cy + 56, highlights, {
        fontSize: '11px', color: '#aaccaa', fontFamily: 'monospace',
      });

      const btn = this.add.text(cardX + cardW - 10, cy + 60, 'Details →', {
        fontSize: '12px', color: '#44cc44', fontFamily: 'monospace',
      }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        AudioManager.get().playSfx('interact');
        this.openModal(j);
      });

      this.contentContainer.add([card, company, role, hl, btn]);
    });

    this.maxScroll = Math.max(0, startY + this.bio.jobs.length * 120 - height + 40);

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

    const ret = this.add.text(width / 2, height - 20, '← Return to World', {
      fontSize: '16px', color: '#44cc44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    ret.on('pointerdown', () => this.returnToWorld());
    this.input.keyboard?.on('keydown-ESC', () => this.returnToWorld());
  }

  private modal: ModalPanel | null = null;
  private openModal(j: Job): void {
    if (!this.modal) this.modal = new ModalPanel(this);
    const highlights = j.highlights.map(h => `• ${h}`).join('\n');
    this.modal.show(`#${j.company}\n#${j.role}\n#${j.period}\n${highlights}`);
  }

  private returnToWorld(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('OverworldScene');
    });
  }
}
