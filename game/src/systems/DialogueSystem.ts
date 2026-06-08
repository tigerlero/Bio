import Phaser from 'phaser';
import { SettingsManager } from './SettingsManager';

export class DialogueSystem {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image | null = null;
  private queue: string[] = [];
  private currentLine = '';
  private charIndex = 0;
  private typeTimer = 0;
  private typeSpeed = 30;
  private isActive = false;
  private isTyping = false;
  private onComplete: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.graphics();
    this.nameText = scene.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    });
    this.bodyText = scene.add.text(0, 0, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: 500 },
      lineSpacing: 4,
    });
    this.container = scene.add.container(0, 0, [this.bg, this.nameText, this.bodyText]);
    this.container.setDepth(90);
    this.container.setVisible(false);

    scene.input.keyboard!.on('keydown-SPACE', () => this.advance());
    scene.input.on('pointerdown', () => {
      if (this.isActive) this.advance();
    });
  }

  show(lines: string[], name: string, portraitKey?: string, onComplete?: () => void): void {
    this.queue = [...lines];
    this.isActive = true;
    this.onComplete = onComplete || null;

    if (portraitKey && this.scene.textures.exists(portraitKey)) {
      if (!this.portrait) {
        this.portrait = this.scene.add.image(0, 0, portraitKey);
        this.container.add(this.portrait);
      }
      this.portrait.setTexture(portraitKey);
      this.portrait.setVisible(true);
    } else if (this.portrait) {
      this.portrait.setVisible(false);
    }

    this.nameText.setText(name);
    this.drawBox();
    this.nextLine();
  }

  private drawBox(): void {
    const { width, height } = this.scene.scale;
    const boxW = width * 0.8;
    const boxH = 140;
    const boxX = (width - boxW) / 2;
    const boxY = height - boxH - 20;

    this.bg.clear();
    this.bg.fillStyle(0x0a0a1a, 0.92);
    this.bg.fillRoundedRect(boxX, boxY, boxW, boxH, 10);
    this.bg.lineStyle(2, 0x4444aa, 0.6);
    this.bg.strokeRoundedRect(boxX, boxY, boxW, boxH, 10);

    const nameOffset = 14;
    const portraitW = this.portrait?.visible ? 50 : 0;
    this.nameText.setPosition(boxX + 16 + portraitW, boxY + nameOffset);
    this.bodyText.setPosition(boxX + 16 + portraitW, boxY + nameOffset + 22);

    if (this.portrait?.visible) {
      this.portrait.setPosition(boxX + 25, boxY + boxH / 2);
      this.portrait.setScale(1.5);
    }
  }

  private nextLine(): void {
    if (this.queue.length === 0) {
      this.close();
      return;
    }
    this.currentLine = this.queue.shift()!;
    this.charIndex = 0;
    this.isTyping = true;
    this.typeTimer = 0;
    this.bodyText.setText('');
    this.drawBox();
  }

  skipAll(): void {
    if (!this.isActive) return;
    this.queue = [];
    this.isTyping = false;
    this.close();
  }

  advance(): void {
    if (!this.isActive) return;
    if (this.isTyping) {
      this.bodyText.setText(this.currentLine);
      this.charIndex = this.currentLine.length;
      this.isTyping = false;
    } else {
      this.nextLine();
    }
  }

  update(dt: number): void {
    if (!this.isActive || !this.isTyping) return;
    this.typeSpeed = SettingsManager.get().get().textSpeed;
    this.typeTimer += dt;
    while (this.typeTimer >= this.typeSpeed && this.charIndex < this.currentLine.length) {
      this.bodyText.setText(this.currentLine.substring(0, this.charIndex + 1));
      this.charIndex++;
      this.typeTimer -= this.typeSpeed;
    }
    if (this.charIndex >= this.currentLine.length) {
      this.isTyping = false;
    }
  }

  private close(): void {
    this.isActive = false;
    this.container.setVisible(false);
    if (this.onComplete) this.onComplete();
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  destroy(): void {
    this.container.destroy();
  }
}
