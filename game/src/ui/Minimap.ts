import Phaser from 'phaser';

interface ZoneRect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

export class Minimap {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private zones: ZoneRect[];
  private worldW: number;
  private worldH: number;
  private mapW = 150;
  private mapH = 120;
  private padding = 10;
  private visible = true;

  constructor(
    scene: Phaser.Scene,
    zones: ZoneRect[],
    worldW: number,
    worldH: number,
  ) {
    this.scene = scene;
    this.zones = zones;
    this.worldW = worldW;
    this.worldH = worldH;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(200);
    this.graphics.setScrollFactor(0);
  }

  update(playerX: number, playerY: number): void {
    if (!this.visible) return;

    const g = this.graphics;
    g.clear();

    const sx = (v: number) => this.padding + (v / this.worldW) * this.mapW;
    const sy = (v: number) => this.padding + (v / this.worldH) * this.mapH;

    // Background
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(0, 0, this.mapW + this.padding * 2, this.mapH + this.padding * 2, 6);

    // Zone rects
    for (const zone of this.zones) {
      g.fillStyle(zone.color, 0.45);
      g.fillRect(sx(zone.x), sy(zone.y), sx(zone.w) - sx(0), sy(zone.h) - sy(0));
      g.lineStyle(1, zone.color, 0.7);
      g.strokeRect(sx(zone.x), sy(zone.y), sx(zone.w) - sx(0), sy(zone.h) - sy(0));
    }

    // Player dot
    g.fillStyle(0xffffff, 1);
    g.fillCircle(sx(playerX), sy(playerY), 4);
    g.lineStyle(2, 0x44ff88, 1);
    g.strokeCircle(sx(playerX), sy(playerY), 4);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.graphics.setVisible(this.visible);
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
