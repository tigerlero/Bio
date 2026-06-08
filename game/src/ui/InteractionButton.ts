import Phaser from 'phaser';

export class InteractionButton {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private _pressed = false;
  private _prevPressed = false;
  justPressed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const cx = width - 80;
    const cy = height - 80;

    this.container = scene.add.container(0, 0).setDepth(1000);
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0xffffff, 0.2);
    this.bg.fillCircle(cx, cy, 35);
    this.bg.lineStyle(2, 0xffffff, 0.4);
    this.bg.strokeCircle(cx, cy, 35);

    this.label = scene.add.text(cx, cy, 'E', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container.add([this.bg, this.label]);

    const hitArea = scene.add.zone(cx, cy, 70, 70).setInteractive().setDepth(1001).setScrollFactor(0);
    hitArea.on('pointerdown', () => {
      this._pressed = true;
      this.bg.clear();
      this.bg.fillStyle(0xffffff, 0.4);
      this.bg.fillCircle(cx, cy, 35);
      this.bg.lineStyle(2, 0xffffff, 0.6);
      this.bg.strokeCircle(cx, cy, 35);
    });
    hitArea.on('pointerup', () => {
      this._pressed = false;
      this.bg.clear();
      this.bg.fillStyle(0xffffff, 0.2);
      this.bg.fillCircle(cx, cy, 35);
      this.bg.lineStyle(2, 0xffffff, 0.4);
      this.bg.strokeCircle(cx, cy, 35);
    });
    hitArea.on('pointerout', () => {
      this._pressed = false;
      this.bg.clear();
      this.bg.fillStyle(0xffffff, 0.2);
      this.bg.fillCircle(cx, cy, 35);
      this.bg.lineStyle(2, 0xffffff, 0.4);
      this.bg.strokeCircle(cx, cy, 35);
    });

    this.hide();
  }

  update(): void {
    this.justPressed = this._pressed && !this._prevPressed;
    this._prevPressed = this._pressed;
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
