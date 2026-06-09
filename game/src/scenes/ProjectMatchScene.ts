import Phaser from 'phaser';
import { getBio } from '../data/bioLoader';
import { AudioManager } from '../systems/AudioManager';

interface Card {
  id: number;
  tech: string;
  flipped: boolean;
  matched: boolean;
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

export class ProjectMatchScene extends Phaser.Scene {
  private cards: Card[] = [];
  private flippedIds: number[] = [];
  private lockInput = false;
  private matches = 0;
  private totalPairs = 0;
  private moves = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private done = false;

  constructor() {
    super({ key: 'ProjectMatchScene' });
  }

  create(): void {
    this.cards = [];
    this.flippedIds = [];
    this.lockInput = false;
    this.matches = 0;
    this.moves = 0;
    this.done = false;

    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#0f1a2a');

    // Collect unique tech items from all projects
    const bio = getBio();
    const techSet = new Set<string>();
    for (const p of bio.projects) {
      for (const t of p.tech) techSet.add(t);
    }
    let techList = [...techSet];
    Phaser.Utils.Array.Shuffle(techList);

    // Duplicate techs so each appears twice (true matching pairs)
    const maxPairs = 8;
    const count = Math.min(maxPairs, techList.length);
    techList = techList.slice(0, count);
    const pairs: { tech: string; pairId: number }[] = [];
    for (let i = 0; i < techList.length; i++) {
      pairs.push({ tech: techList[i], pairId: i });
      pairs.push({ tech: techList[i], pairId: i });
    }
    Phaser.Utils.Array.Shuffle(pairs);
    this.totalPairs = techList.length;

    // Layout: 4×4 grid
    const cols = 4;
    const cellW = 120;
    const cellH = 64;
    const gap = 12;
    const gridW = cols * cellW + (cols - 1) * gap;
    const startX = (width - gridW) / 2 + cellW / 2;
    const startY = height * 0.35;

    this.cards = pairs.map((pair, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cellW + gap);
      const cy = startY + row * (cellH + gap);

      const gfx = this.add.graphics().setDepth(2);
      const label = this.add.text(cx, cy, pair.tech, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5).setDepth(3).setVisible(false);

      // Click zone
      const zone = this.add.zone(cx, cy, cellW, cellH).setInteractive({ useHandCursor: true }).setDepth(4);
      zone.on('pointerdown', () => this.flipCard(i));

      this.drawCard(gfx, cx, cy, cellW, cellH, false);

      return { id: pair.pairId, tech: pair.tech, flipped: false, matched: false, gfx, label, x: cx, y: cy };
    });

    // Title
    this.add.text(width / 2, 30, '✦ PROJECT MATCH ✦', {
      fontSize: '22px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.scoreText = this.add.text(width / 2, 60, `Matches: 0/${this.totalPairs}  Moves: 0`, {
      fontSize: '13px', color: '#88bbff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.statusText = this.add.text(width / 2, height * 0.2, 'Click cards to find matching tech pairs!', {
      fontSize: '12px', color: '#aaccdd', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    // ESC to return
    this.input.keyboard!.on('keydown-ESC', () => this.returnToPark());
  }

  private flipCard(index: number): void {
    if (this.lockInput || this.done) return;
    const card = this.cards[index];
    if (card.flipped || card.matched) return;
    if (this.flippedIds.length >= 2) return;

    AudioManager.get().playSfx('hover');
    card.flipped = true;
    this.flippedIds.push(index);
    this.drawCard(card.gfx, card.x, card.y, 120, 64, true);
    card.label.setVisible(true);

    if (this.flippedIds.length === 2) {
      this.moves++;
      this.lockInput = true;
      const c1 = this.cards[this.flippedIds[0]];
      const c2 = this.cards[this.flippedIds[1]];

      if (c1.id === c2.id) {
        this.flippedIds = [];
        this.lockInput = false;
        c1.matched = true;
        c2.matched = true;
        this.matches++;
        AudioManager.get().playSfx('step');
        this.scoreText.setText(`Matches: ${this.matches}/${this.totalPairs}  Moves: ${this.moves}`);

        if (this.matches === this.totalPairs) {
          this.showWin();
        }
      } else {
        this.time.delayedCall(800, () => {
          c1.flipped = false;
          c2.flipped = false;
          this.drawCard(c1.gfx, c1.x, c1.y, 120, 64, false);
          c1.label.setVisible(false);
          this.drawCard(c2.gfx, c2.x, c2.y, 120, 64, false);
          c2.label.setVisible(false);
          this.flippedIds = [];
          this.lockInput = false;
        });
      }
      this.scoreText.setText(`Matches: ${this.matches}/${this.totalPairs}  Moves: ${this.moves}`);
    }
  }

  private drawCard(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, flipped: boolean): void {
    gfx.clear();
    if (flipped) {
      gfx.fillStyle(0x1a3355, 1);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      gfx.lineStyle(2, 0x4488ff, 0.8);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    } else {
      gfx.fillStyle(0x2a4a6a, 1);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      gfx.lineStyle(2, 0x6688aa, 0.5);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      // Question mark
      gfx.fillStyle(0x88aacc, 0.6);
      gfx.fillCircle(x, y, 14);
    }
  }

  private showWin(): void {
    this.done = true;
    AudioManager.get().playSfx('interact');
    this.statusText.setText(`✦ ALL MATCHED! ✦  (${this.moves} moves)`);
    this.statusText.setColor('#44ff88');
    this.time.delayedCall(2500, () => this.returnToPark());
  }

  private returnToPark(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('ProjectParkScene');
    });
  }
}
