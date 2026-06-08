import Phaser from 'phaser';
import { getBio } from '../data/bioLoader';

export class SkillTreeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SkillTreeScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d0d1a');

    const bio = getBio();
    let yOff = 40;

    const title = this.add.text(width / 2, yOff, '✦ SKILL TREE ✦', {
      fontSize: '28px',
      color: '#cc44ff',
      fontFamily: 'monospace',
    });
    title.setOrigin(0.5);
    yOff += 50;

    for (const [category, skills] of Object.entries(bio.skills)) {
      // Category label
      const catLabel = this.add.text(40, yOff, category, {
        fontSize: '18px',
        color: '#ffdd44',
        fontFamily: 'monospace',
      });
      yOff += 28;

      // Individual skill bars
      for (const skill of skills) {
        const barLen = Math.min(250, 100 + skill.length * 8);
        this.add.text(60, yOff, skill, {
          fontSize: '13px',
          color: '#cccccc',
          fontFamily: 'monospace',
        });

        const barBg = this.add.graphics();
        barBg.fillStyle(0x333355, 1);
        barBg.fillRect(260, yOff + 2, barLen, 12);

        const barFill = this.add.graphics();
        const hue = (skill.length * 20) % 360;
        barFill.fillStyle(Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.5).color, 1);
        barFill.fillRect(260, yOff + 2, barLen * 0.75, 12);

        yOff += 22;
      }
      yOff += 10;
    }

    // Back button
    const backBtn = this.add.text(width / 2, height - 40, '← Press ESC to return to the world', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace',
    });
    backBtn.setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.returnToOverworld());

    this.input.keyboard!.on('keydown-ESC', () => this.returnToOverworld());
  }

  private returnToOverworld(): void {
    this.scene.start('OverworldScene');
  }
}
