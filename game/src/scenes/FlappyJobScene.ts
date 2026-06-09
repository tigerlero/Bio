import Phaser from 'phaser';
import { getBio } from '../data/bioLoader';
import { AudioManager } from '../systems/AudioManager';

interface PipePair {
  x: number;
  topH: number;
  gap: number;
  scored: boolean;
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

export class FlappyJobScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Graphics;
  private playerY = 250;
  private playerVY = 0;
  private gravity = 900;
  private flapVel = -300;
  private pipes: PipePair[] = [];
  private pipeTimer = 0;
  private pipeInterval = 1800;
  private pipeSpeed = -160;
  private pipeW = 56;
  private gapSize = 160;
  private minTop = 60;
  private maxBottom = 480;
  private score = 0;
  private started = false;
  private gameOver = false;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private flapKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private bgGfx!: Phaser.GameObjects.Graphics;
  private groundGfx!: Phaser.GameObjects.Graphics;
  private labelsPool: string[] = [];

  constructor() {
    super({ key: 'FlappyJobScene' });
  }

  create(): void {
    this.playerY = 250;
    this.playerVY = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.score = 0;
    this.started = false;
    this.gameOver = false;

    const { width, height } = this.scale;
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#1a2a3a');

    // Build label pool from jobs and projects
    const bio = getBio();
    this.labelsPool = [];
    for (const j of bio.jobs) {
      this.labelsPool.push(j.role);
    }
    for (const p of bio.projects) {
      this.labelsPool.push(p.title);
    }

    // Background gradient
    this.bgGfx = this.add.graphics().setDepth(0);
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(0x2a + t * 0x1e);
      const g = Math.floor(0x3a + t * 0x2a);
      const b = Math.floor(0x5a + t * 0x1a);
      const color = (r << 16) | (g << 8) | b;
      this.bgGfx.fillStyle(color, 1);
      this.bgGfx.fillRect(0, (height / steps) * i, width, height / steps + 1);
    }

    // Clouds
    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * width;
      const cy = 40 + Math.random() * 120;
      const cw = 60 + Math.random() * 100;
      const ch = 20 + Math.random() * 15;
      const cg = this.add.graphics().setDepth(1);
      cg.fillStyle(0xffffff, 0.08);
      cg.fillRoundedRect(cx, cy, cw, ch, 10);
    }

    // Ground
    this.groundGfx = this.add.graphics().setDepth(5);
    this.groundGfx.fillStyle(0x3a5a3a, 1);
    this.groundGfx.fillRect(0, height - 50, width, 50);
    this.groundGfx.fillStyle(0x4a7a4a, 1);
    this.groundGfx.fillRect(0, height - 52, width, 4);

    // Player
    this.player = this.add.graphics().setDepth(6);
    this.drawPlayer();

    // UI
    this.add.text(width / 2, 18, '✦ FLAPPY JOB ✦', {
      fontSize: '18px', color: '#88ddff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.scoreText = this.add.text(width / 2, 42, 'Jobs: 0', {
      fontSize: '13px', color: '#ccffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.statusText = this.add.text(width / 2, height / 2, 'Click or Space to start', {
      fontSize: '15px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Input
    this.flapKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.keyboard!.on('keydown-ESC', () => this.returnToDistrict());

    this.input.on('pointerdown', () => this.flap());
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000;
    const { width, height } = this.scale;

    // Flap on space
    if (Phaser.Input.Keyboard.JustDown(this.flapKey)) this.flap();

    if (!this.started) {
      this.drawPlayer();
      return;
    }

    // Physics
    this.playerVY += this.gravity * dt;
    this.playerY += this.playerVY * dt;
    this.drawPlayer();

    // Ground / ceiling collision
    if (this.playerY > height - 50 - 14 || this.playerY < 14) {
      this.endGame();
      return;
    }

    // Spawn pipes
    this.pipeTimer += delta;
    if (this.pipeTimer >= this.pipeInterval) {
      this.pipeTimer = 0;
      this.spawnPipe(width, height);
    }

    // Update pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x += this.pipeSpeed * dt;
      this.drawPipe(p);

      // Scoring
      if (!p.scored && p.x + this.pipeW / 2 < 150) {
        p.scored = true;
        this.score++;
        AudioManager.get().playSfx('step');
        this.scoreText.setText(`Jobs: ${this.score}`);
      }

      // Collision with pipe
      const px = 150, py = this.playerY;
      const pr = 12;
      if (px + pr > p.x - this.pipeW / 2 && px - pr < p.x + this.pipeW / 2) {
        if (py - pr < p.topH || py + pr > p.topH + p.gap) {
          this.endGame();
          return;
        }
      }

      // Remove off-screen
      if (p.x + this.pipeW / 2 < -20) {
        p.gfx.destroy();
        p.label.destroy();
        this.pipes.splice(i, 1);
      }
    }
  }

  private flap(): void {
    if (this.gameOver) return;
    if (!this.started) {
      this.started = true;
      this.statusText.setAlpha(0);
      this.pipeTimer = 600; // small delay before first pipe
    }
    this.playerVY = this.flapVel;
    AudioManager.get().playSfx('hover');
  }

  private spawnPipe(w: number, h: number): void {
    const minGap = this.gapSize;
    const maxTop = h - 50 - minGap - this.minTop;
    const topH = Phaser.Math.Between(this.minTop, Math.max(this.minTop + 10, maxTop));
    const x = w + this.pipeW / 2;

    const gfx = this.add.graphics().setDepth(3);
    const labelText = this.labelsPool[Math.floor(Math.random() * this.labelsPool.length)];
    const label = this.add.text(0, 0, labelText, {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5).setDepth(4);

    const pair: PipePair = { x, topH, gap: minGap, scored: false, gfx, label };
    this.pipes.push(pair);
    this.drawPipe(pair);
  }

  private drawPipe(p: PipePair): void {
    const hw = this.pipeW / 2;
    p.gfx.clear();

    // Top pipe
    p.gfx.fillStyle(0x4488aa, 1);
    p.gfx.fillRect(p.x - hw, 0, this.pipeW, p.topH);
    p.gfx.fillStyle(0x336688, 1);
    p.gfx.fillRect(p.x - hw - 4, p.topH - 20, this.pipeW + 8, 14);

    // Bottom pipe
    const botY = p.topH + p.gap;
    const { height } = this.scale;
    p.gfx.fillStyle(0x4488aa, 1);
    p.gfx.fillRect(p.x - hw, botY, this.pipeW, height - botY);
    p.gfx.fillStyle(0x336688, 1);
    p.gfx.fillRect(p.x - hw - 4, botY, this.pipeW + 8, 14);

    // Cap highlight
    p.gfx.fillStyle(0x55ccff, 0.3);
    p.gfx.fillRect(p.x - hw + 4, 0, 6, p.topH);
    p.gfx.fillRect(p.x - hw + 4, botY, 6, height - botY);

    // Label on the top pipe cap
    p.label.setPosition(p.x, p.topH - 13);
  }

  private drawPlayer(): void {
    this.player.clear();
    const px = 150;
    const tilt = Phaser.Math.Clamp(this.playerVY * 0.04, -30, 30);

    // Body
    this.player.fillStyle(0xffdd44, 1);
    this.player.fillEllipse(px, this.playerY, 24, 20);

    // Wing
    this.player.fillStyle(0xffaa22, 1);
    this.player.fillEllipse(px - 8, this.playerY - 2, 10, 6);

    // Eye
    this.player.fillStyle(0xffffff, 1);
    this.player.fillCircle(px + 5, this.playerY - 3, 5);
    this.player.fillStyle(0x222222, 1);
    this.player.fillCircle(px + 7, this.playerY - 3, 2);

    // Beak
    this.player.fillStyle(0xff6622, 1);
    this.player.fillTriangle(px + 12, this.playerY, px + 18, this.playerY - 2, px + 12, this.playerY + 4);
  }

  private endGame(): void {
    this.gameOver = true;
    AudioManager.get().playSfx('interact');
    this.statusText.setText(`✦ GAME OVER ✦\nJobs Completed: ${this.score}`);
    this.statusText.setAlpha(1);
    this.statusText.setColor('#ff8844');
    this.time.delayedCall(2500, () => this.returnToDistrict());
  }

  private returnToDistrict(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('JobDistrictScene'));
  }
}
