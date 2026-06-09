export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private worldW = 900;
  private worldH = 700;
  private zones: { name: string; x: number; z: number; w: number; h: number; color: string }[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 140;
    this.canvas.height = 110;
    this.canvas.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:100;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.5);pointer-events:none;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  setZones(zones: { name: string; x: number; z: number; w: number; h: number; color: number }[]): void {
    this.zones = zones.map(z => ({
      ...z,
      color: '#' + z.color.toString(16).padStart(6, '0'),
    }));
  }

  update(playerX: number, playerZ: number): void {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scaleX = (cw - 8) / this.worldW;
    const scaleY = (ch - 8) / this.worldH;

    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, cw, ch);

    // Zones
    for (const z of this.zones) {
      const rx = 4 + z.x * scaleX;
      const ry = 4 + z.z * scaleY;
      const rw = z.w * scaleX;
      const rh = z.h * scaleY;
      ctx.fillStyle = z.color + '40';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = z.color + '80';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = z.color;
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(z.name, rx + rw / 2, ry + rh / 2 + 2);
    }

    // Player dot
    const px = 4 + playerX * scaleX;
    const py = 4 + playerZ * scaleY;
    ctx.fillStyle = '#44ff88';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  destroy(): void {
    this.canvas.remove();
  }
}
