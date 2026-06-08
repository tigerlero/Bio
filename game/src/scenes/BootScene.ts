import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width, height } = this.scale;
    const barW = 320;
    const barH = 30;
    const x = (width - barW) / 2;
    const y = height / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 1);
    bg.fillRect(0, 0, width, height);

    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 1);
    border.strokeRect(x, y, barW, barH);

    const fill = this.add.graphics();
    this.load.on('progress', (val: number) => {
      fill.clear();
      fill.fillStyle(0x00ff88, 1);
      fill.fillRect(x + 2, y + 2, (barW - 4) * val, barH - 4);
    });

    const txt = this.add.text(width / 2, y - 30, 'Loading...', {
      fontSize: '18px',
      color: '#ffffff',
    });
    txt.setOrigin(0.5);

    // Load company logos
    const logoFiles = ['valmore.png', 'expresstransfers.png', 'evalion.png', 'newdeal.png', 'datawise.png'];
    for (const f of logoFiles) {
      this.load.image(`logo_${f.replace('.png', '')}`, `logos/${f}`);
    }

    // Generate placeholder textures
    this.createPlaceholderTextures();
  }

  create(): void {
    this.scene.start('TitleScene');
  }

  private createPlaceholderTextures(): void {
    // Player spritesheet (24x32 each frame, 4 frames)
    const canvas = this.textures.createCanvas('player_sheet', 96, 32);
    if (!canvas) return;
    const ctx = canvas.getContext();

    for (let i = 0; i < 4; i++) {
      const ox = i * 24;
      ctx.fillStyle = '#3366cc';
      ctx.fillRect(ox + 4, 0, 16, 24);
      ctx.fillStyle = '#ffcc88';
      ctx.fillRect(ox + 6, 4, 12, 10);
      ctx.fillStyle = '#224488';
      ctx.fillRect(ox + 6, 16, 12, 12);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ox + 8, 6, 3, 3);
      ctx.fillRect(ox + 13, 6, 3, 3);
    }
    canvas.refresh();
    // Add sprite sheet frame data for generateFrameNumbers
    for (let i = 0; i < 4; i++) {
      canvas.add(i, 0, i * 24, 0, 24, 32);
    }

    // NPC texture
    const npcCanvas = this.textures.createCanvas('npc', 24, 32);
    if (npcCanvas) {
      const nctx = npcCanvas.getContext();
      nctx.fillStyle = '#44cc44';
      nctx.fillRect(4, 0, 16, 24);
      nctx.fillStyle = '#ffcc88';
      nctx.fillRect(6, 4, 12, 10);
      nctx.fillStyle = '#228822';
      nctx.fillRect(6, 16, 12, 12);
      npcCanvas.refresh();
    }

    // Building texture
    const buildCanvas = this.textures.createCanvas('building', 48, 48);
    if (buildCanvas) {
      const bctx = buildCanvas.getContext();
      bctx.fillStyle = '#885533';
      bctx.fillRect(0, 0, 48, 48);
      bctx.fillStyle = '#aa7744';
      bctx.fillRect(4, 4, 40, 40);
      bctx.fillStyle = '#664422';
      bctx.fillRect(16, 8, 16, 20);
      buildCanvas.refresh();
    }

    // Book texture
    const bookCanvas = this.textures.createCanvas('book', 20, 24);
    if (bookCanvas) {
      const bkctx = bookCanvas.getContext();
      bkctx.fillStyle = '#cc8844';
      bkctx.fillRect(2, 2, 16, 20);
      bkctx.fillStyle = '#ffffff';
      bkctx.fillRect(4, 4, 12, 16);
      bkctx.fillStyle = '#000000';
      bkctx.fillRect(6, 6, 8, 2);
      bkctx.fillRect(6, 10, 8, 2);
      bkctx.fillRect(6, 14, 8, 2);
      bookCanvas.refresh();
    }

    // Crystal/gem texture for skills
    const gemCanvas = this.textures.createCanvas('gem', 20, 24);
    if (gemCanvas) {
      const gctx = gemCanvas.getContext();
      gctx.fillStyle = '#ff44ff';
      gctx.beginPath();
      gctx.moveTo(10, 2);
      gctx.lineTo(18, 12);
      gctx.lineTo(10, 22);
      gctx.lineTo(2, 12);
      gctx.closePath();
      gctx.fill();
      gctx.fillStyle = '#ff88ff';
      gctx.beginPath();
      gctx.moveTo(10, 4);
      gctx.lineTo(16, 12);
      gctx.lineTo(10, 20);
      gctx.lineTo(4, 12);
      gctx.closePath();
      gctx.fill();
      gemCanvas.refresh();
    }

    // Rock texture for obstacles
    const rockCanvas = this.textures.createCanvas('rock', 24, 18);
    if (rockCanvas) {
      const rctx = rockCanvas.getContext();
      rctx.fillStyle = '#666666';
      rctx.beginPath();
      rctx.ellipse(12, 10, 10, 7, 0, 0, Math.PI * 2);
      rctx.fill();
      rctx.fillStyle = '#888888';
      rctx.beginPath();
      rctx.ellipse(8, 8, 5, 4, 0, 0, Math.PI * 2);
      rctx.fill();
      rockCanvas.refresh();
    }

    // Tree texture
    const treeCanvas = this.textures.createCanvas('tree', 32, 48);
    if (treeCanvas) {
      const tctx = treeCanvas.getContext();
      tctx.fillStyle = '#553311';
      tctx.fillRect(12, 28, 8, 20);
      tctx.fillStyle = '#228833';
      tctx.beginPath();
      tctx.arc(16, 14, 14, 0, Math.PI * 2);
      tctx.fill();
      tctx.fillStyle = '#33aa44';
      tctx.beginPath();
      tctx.arc(12, 12, 8, 0, Math.PI * 2);
      tctx.fill();
      treeCanvas.refresh();
    }

    // Flower textures
    const flowerCanvas = this.textures.createCanvas('flower', 12, 12);
    if (flowerCanvas) {
      const fctx = flowerCanvas.getContext();
      fctx.fillStyle = '#ff6666';
      fctx.beginPath();
      fctx.arc(6, 6, 4, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = '#ffff00';
      fctx.beginPath();
      fctx.arc(6, 6, 2, 0, Math.PI * 2);
      fctx.fill();
      flowerCanvas.refresh();
    }
  }
}
