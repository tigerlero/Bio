import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

interface BugBlock {
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}

const ROWS = [
  { label: 'RUNTIME ERRORS', color: 0xff4444, bugs: ['Null Pointer', 'Stack Overflow', 'Memory Leak', 'Out of Bounds'] },
  { label: 'LOGIC BUGS', color: 0xff8844, bugs: ['Off-by-One', 'Infinite Loop', 'Race Condition', 'Deadlock'] },
  { label: 'SECURITY HOLES', color: 0xffdd44, bugs: ['SQL Injection', 'XSS Attack', 'Buffer Overflow', 'Hardcoded Creds'] },
  { label: 'CODE SMELLS', color: 0x44ff44, bugs: ['Spaghetti Code', 'Magic Numbers', 'Circular Dep', 'Callback Hell'] },
  { label: 'ASYNC BUGS', color: 0x4488ff, bugs: ['Uncaught Promise', 'Hoisting', 'Type Coercion', 'Floating Point'] },
];

export class BugBreakerScene extends Phaser.Scene {
  private paddle!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Graphics;
  private blocks: BugBlock[] = [];
  private score = 0;
  private lives = 3;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private px = 400;
  private bx = 400;
  private by = 540;
  private bvx = 200;
  private bvy = -250;
  private launched = false;
  private gameOver = false;
  private win = false;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BugBreakerScene' });
  }

  create(): void {
    this.blocks = [];
    this.score = 0;
    this.lives = 3;
    this.launched = false;
    this.gameOver = false;
    this.win = false;
    this.px = 400;
    this.bx = 400;
    this.by = 540;
    this.bvx = 200;
    this.bvy = -250;

    const { width, height } = this.scale;
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#0a0f1a');

    // Title
    this.add.text(width / 2, 14, '✦ BUG BREAKER ✦', {
      fontSize: '18px', color: '#ff6644', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.scoreText = this.add.text(10, 45, 'Score: 0', {
      fontSize: '12px', color: '#ffdd88', fontFamily: 'monospace',
    }).setDepth(10);

    this.livesText = this.add.text(width - 10, 45, 'Lives: 3', {
      fontSize: '12px', color: '#88ddff', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(10);

    this.statusText = this.add.text(width / 2, height / 2 - 60, '', {
      fontSize: '11px', color: '#aabbcc', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    // Paddle
    this.paddle = this.add.graphics().setDepth(2);

    // Ball
    this.ball = this.add.graphics().setDepth(2);

    // Build blocks
    const cols = 4;
    const blockW = 90;
    const blockH = 22;
    const gap = 6;
    const startY = 68;
    const totalW = cols * blockW + (cols - 1) * gap;
    const startX = (width - totalW) / 2 + blockW / 2;

    for (let row = 0; row < ROWS.length; row++) {
      const r = ROWS[row];
      const y = startY + row * (blockH + gap);
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (blockW + gap);
        const gfx = this.add.graphics().setDepth(1);
        gfx.fillStyle(r.color, 0.9);
        gfx.fillRoundedRect(x - blockW / 2, y, blockW, blockH, 3);
        gfx.lineStyle(1, 0xffffff, 0.15);
        gfx.strokeRoundedRect(x - blockW / 2, y, blockW, blockH, 3);
        const label = this.add.text(x, y + blockH / 2, r.bugs[col], {
          fontSize: '8px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
        this.blocks.push({ gfx, label, x, y, w: blockW, h: blockH, alive: true });
      }
    }

    // Row labels
    for (let row = 0; row < ROWS.length; row++) {
      const r = ROWS[row];
      const y = startY + row * (blockH + gap) + blockH / 2;
      this.add.text(8, y, r.label, {
        fontSize: '7px', color: '#6688aa', fontFamily: 'monospace',
      }).setOrigin(0, 0.5).setDepth(3);
    }

    // Instructions
    this.add.text(width / 2, height - 16, 'Mouse / Arrow keys to move  |  Click / Space to launch', {
      fontSize: '10px', color: '#556677', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    // Controls
    const kb = this.input.keyboard!;
    this.keys['left'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keys['right'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keys['a'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keys['d'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    kb.on('keydown-ESC', () => this.returnToGarden());
    kb.on('keydown-SPACE', () => this.launch());
    this.input.on('pointerdown', () => this.launch());
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.gameOver && !this.win) {
        this.px = Phaser.Math.Clamp(p.x, 40, width - 40);
      }
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.win) return;

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // Keyboard paddle
    if (this.keys['left'].isDown || this.keys['a'].isDown) {
      this.px = Phaser.Math.Clamp(this.px - 300 * dt, 40, width - 40);
    }
    if (this.keys['right'].isDown || this.keys['d'].isDown) {
      this.px = Phaser.Math.Clamp(this.px + 300 * dt, 40, width - 40);
    }

    // Ball follows paddle before launch
    if (!this.launched) {
      this.bx = this.px;
      this.by = 540;
    } else {
      this.bx += this.bvx * dt;
      this.by += this.bvy * dt;

      // Wall bounce
      if (this.bx < 6) { this.bx = 6; this.bvx = Math.abs(this.bvx); }
      if (this.bx > width - 6) { this.bx = width - 6; this.bvx = -Math.abs(this.bvx); }
      if (this.by < 30) { this.by = 30; this.bvy = Math.abs(this.bvy); }

      // Paddle bounce
      const paddleW = 80;
      const paddleTop = 556;
      if (this.bvy > 0 && this.by > paddleTop - 4 && this.by < paddleTop + 8 &&
          this.bx > this.px - paddleW / 2 - 6 && this.bx < this.px + paddleW / 2 + 6) {
        const hitRatio = (this.bx - this.px) / (paddleW / 2);
        this.bvx = hitRatio * 300;
        this.bvy = -Math.abs(this.bvy);
        this.by = paddleTop - 4;
        AudioManager.get().playSfx('hover');
      }

      // Lose ball
      if (this.by > height + 10) {
        this.lives--;
        this.livesText.setText(`Lives: ${this.lives}`);
        AudioManager.get().playSfx('interact');
        if (this.lives <= 0) {
          this.showGameOver();
          return;
        }
        this.launched = false;
        this.bvx = 200;
        this.bvy = -250;
      }

      // Block collision
      for (const block of this.blocks) {
        if (!block.alive) continue;
        if (this.bx + 5 > block.x - block.w / 2 && this.bx - 5 < block.x + block.w / 2 &&
            this.by + 5 > block.y && this.by - 5 < block.y + block.h) {
          block.alive = false;
          block.gfx.setVisible(false);
          block.label.setVisible(false);
          // Determine bounce direction
          const overlapLeft = (this.bx + 5) - (block.x - block.w / 2);
          const overlapRight = (block.x + block.w / 2) - (this.bx - 5);
          const overlapTop = (this.by + 5) - block.y;
          const overlapBottom = (block.y + block.h) - (this.by - 5);
          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);
          if (minOverlapX < minOverlapY) {
            this.bvx = -this.bvx;
          } else {
            this.bvy = -this.bvy;
          }
          this.score += 10;
          this.scoreText.setText(`Score: ${this.score}`);
          AudioManager.get().playSfx('step');
          break;
        }
      }

      // Win check
      if (this.blocks.every(b => !b.alive)) {
        this.showWin();
        return;
      }
    }

    // Draw paddle
    this.paddle.clear();
    this.paddle.fillStyle(0x4488ff, 0.9);
    this.paddle.fillRoundedRect(this.px - 40, 556, 80, 10, 4);
    this.paddle.fillStyle(0x66aaff, 0.3);
    this.paddle.fillRoundedRect(this.px - 38, 558, 76, 4, 2);

    // Draw ball
    this.ball.clear();
    this.ball.fillStyle(0xffffff, 1);
    this.ball.fillCircle(this.bx, this.by, 6);
    this.ball.fillStyle(0x88ccff, 0.4);
    this.ball.fillCircle(this.bx - 1, this.by - 1, 3);
  }

  private launch(): void {
    if (this.gameOver || this.win) return;
    if (!this.launched) {
      this.launched = true;
      // Randomize horizontal direction slightly
      this.bvx = (Math.random() - 0.5) * 300;
      if (Math.abs(this.bvx) < 60) this.bvx = 60 * Math.sign(this.bvx) || 60;
      this.bvy = -250;
    }
  }

  private showGameOver(): void {
    this.gameOver = true;
    this.statusText.setText('✗ GAME OVER ✗');
    this.statusText.setColor('#ff4444');
    AudioManager.get().playSfx('interact');
    this.time.delayedCall(2000, () => this.returnToGarden());
  }

  private showWin(): void {
    this.win = true;
    this.statusText.setText(`✦ ALL BUGS SQUASHED! ✦  Score: ${this.score}`);
    this.statusText.setColor('#44ff88');
    AudioManager.get().playSfx('interact');
    this.time.delayedCall(3000, () => this.returnToGarden());
  }

  private returnToGarden(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('SkillGardenScene');
    });
  }
}
