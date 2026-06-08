import Phaser from 'phaser';

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private base: Phaser.GameObjects.Graphics;
  private thumb: Phaser.GameObjects.Graphics;
  private baseX: number;
  private baseY: number;
  private radius = 60;
  private active = false;
  private pointerId = -1;
  dx = 0;
  dy = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.baseX = 80;
    this.baseY = height - 80;

    this.container = scene.add.container(0, 0).setDepth(1000);
    this.base = scene.add.graphics();
    this.thumb = scene.add.graphics();
    this.container.add([this.base, this.thumb]);
    this.drawBase();

    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);

    this.hide();
  }

  private drawBase(): void {
    this.base.clear();
    this.base.fillStyle(0xffffff, 0.15);
    this.base.fillCircle(this.baseX, this.baseY, this.radius);
    this.base.lineStyle(2, 0xffffff, 0.3);
    this.base.strokeCircle(this.baseX, this.baseY, this.radius);
    this.drawThumb(this.baseX, this.baseY);
  }

  private drawThumb(x: number, y: number): void {
    this.thumb.clear();
    this.thumb.fillStyle(0xffffff, 0.4);
    this.thumb.fillCircle(x, y, 20);
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    const dist = Phaser.Math.Distance.Between(p.x, p.y, this.baseX, this.baseY);
    if (dist < this.radius * 1.5) {
      this.active = true;
      this.pointerId = p.id;
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (!this.active || p.id !== this.pointerId) return;
    let dx = p.x - this.baseX;
    let dy = p.y - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }
    this.dx = dx / this.radius;
    this.dy = dy / this.radius;
    this.drawThumb(this.baseX + dx, this.baseY + dy);
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (!this.active || p.id !== this.pointerId) return;
    this.active = false;
    this.pointerId = -1;
    this.dx = 0;
    this.dy = 0;
    this.drawThumb(this.baseX, this.baseY);
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  isActive(): boolean {
    return this.active;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.container.destroy();
  }
}
