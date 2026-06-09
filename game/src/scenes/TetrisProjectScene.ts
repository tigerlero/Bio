import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const COLS = 10;
const ROWS = 20;
const CELL = 26;
const GRID_X = 40;
const GRID_Y = 36;

const COLORS: number[] = [
  0x00ffff, 0xffff00, 0xaa44ff, 0x44ff44, 0xff4444, 0x4488ff, 0xff8844,
];
const NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const SHAPES: number[][][] = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
];

export class TetrisProjectScene extends Phaser.Scene {
  private board: number[][] = [];
  private piece: { shape: number[][]; x: number; y: number; type: number } | null = null;
  private nextType = 0;
  private score = 0;
  private level = 1;
  private lines = 0;
  private dropTimer = 0;
  private dropInterval = 500;
  private gameOver = false;
  private paused = false;
  private boardGfx!: Phaser.GameObjects.Graphics;
  private pieceGfx!: Phaser.GameObjects.Graphics;
  private nextGfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  constructor() {
    super({ key: 'TetrisProjectScene' });
  }

  create(): void {
    this.board = [];
    for (let x = 0; x < COLS; x++) { this.board[x] = []; for (let y = 0; y < ROWS; y++) this.board[x][y] = -1; }
    this.score = 0; this.level = 1; this.lines = 0; this.gameOver = false; this.paused = false;
    this.dropTimer = 0; this.dropInterval = 500;

    const { width, height } = this.scale;
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#0a0f1a');

    // Board background
    const bg = this.add.graphics();
    bg.fillStyle(0x111a2a, 1);
    bg.fillRect(GRID_X - 2, GRID_Y - 2, COLS * CELL + 4, ROWS * CELL + 4);

    this.boardGfx = this.add.graphics().setDepth(1);
    this.pieceGfx = this.add.graphics().setDepth(2);
    this.nextGfx = this.add.graphics().setDepth(3);

    // Grid lines
    const gridGfx = this.add.graphics().setDepth(0);
    gridGfx.lineStyle(1, 0x1a2a3a, 0.5);
    for (let x = 0; x <= COLS; x++) {
      gridGfx.moveTo(GRID_X + x * CELL, GRID_Y);
      gridGfx.lineTo(GRID_X + x * CELL, GRID_Y + ROWS * CELL);
    }
    for (let y = 0; y <= ROWS; y++) {
      gridGfx.moveTo(GRID_X, GRID_Y + y * CELL);
      gridGfx.lineTo(GRID_X + COLS * CELL, GRID_Y + y * CELL);
    }
    gridGfx.strokePath();

    this.add.text(width / 2, 8, '✦ TETRIS PROJECTS ✦', {
      fontSize: '16px', color: '#88ccff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    const sideX = GRID_X + COLS * CELL + 20;
    this.add.text(sideX, 100, 'NEXT', {
      fontSize: '12px', color: '#6688aa', fontFamily: 'monospace', fontStyle: 'bold',
    }).setDepth(10);

    this.scoreText = this.add.text(sideX, 200, 'Lines: 0', {
      fontSize: '12px', color: '#aaddff', fontFamily: 'monospace',
    }).setDepth(10);
    this.levelText = this.add.text(sideX, 220, 'Level: 1', {
      fontSize: '12px', color: '#aaddff', fontFamily: 'monospace',
    }).setDepth(10);

    this.statusText = this.add.text(width / 2, height / 2, '', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    // Controls hint
    this.add.text(sideX, 300, '← → Move\n↑ Rotate\n↓ Soft drop\nSpace: Hard drop\nP: Pause\nESC: Quit', {
      fontSize: '10px', color: '#556677', fontFamily: 'monospace', lineSpacing: 4,
    }).setDepth(10);

    const kb = this.input.keyboard!;
    this.keys['left'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keys['right'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keys['down'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keys['up'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keys['space'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keys['p'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    kb.on('keydown-ESC', () => this.returnToPark());

    this.nextType = Math.floor(Math.random() * 7);
    this.spawnPiece();

    // Touch controls
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.gameOver || this.paused) return;
      const relX = p.x / width;
      if (relX < 0.3) this.movePiece(-1);
      else if (relX > 0.7) this.movePiece(1);
      else if (p.y < height * 0.5) this.rotatePiece();
      else this.hardDrop();
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.paused) return;

    this.handleKeys();

    this.dropTimer += delta;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (!this.moveDown()) this.lockPiece();
    }
    this.render();
  }

  private handleKeys(): void {
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k['left'])) this.movePiece(-1);
    if (Phaser.Input.Keyboard.JustDown(k['right'])) this.movePiece(1);
    if (Phaser.Input.Keyboard.JustDown(k['up'])) this.rotatePiece();
    if (k['down'].isDown) this.dropInterval = 50;
    else this.dropInterval = Math.max(80, 500 - (this.level - 1) * 30);
    if (Phaser.Input.Keyboard.JustDown(k['space'])) this.hardDrop();
    if (Phaser.Input.Keyboard.JustDown(k['p'])) this.togglePause();
  }

  private spawnPiece(): void {
    this.piece = { shape: SHAPES[this.nextType], x: Math.floor((COLS - SHAPES[this.nextType][0].length) / 2), y: 0, type: this.nextType };
    this.nextType = Math.floor(Math.random() * 7);
    if (this.collides(this.piece.x, this.piece.y, this.piece.shape)) {
      this.gameOver = true;
      this.showGameOver();
    }
  }

  private lockPiece(): void {
    if (!this.piece) return;
    for (let r = 0; r < this.piece.shape.length; r++) {
      for (let c = 0; c < this.piece.shape[r].length; c++) {
        if (this.piece.shape[r][c]) {
          const bx = this.piece.x + c;
          const by = this.piece.y + r;
          if (bx >= 0 && bx < COLS && by >= 0 && by < ROWS) this.board[bx][by] = this.piece.type;
        }
      }
    }
    this.clearLines();
    this.spawnPiece();
  }

  private clearLines(): void {
    for (let y = ROWS - 1; y >= 0; y--) {
      let full = true;
      for (let x = 0; x < COLS; x++) { if (this.board[x][y] === -1) { full = false; break; } }
      if (full) {
        for (let yy = y; yy > 0; yy--) for (let x = 0; x < COLS; x++) this.board[x][yy] = this.board[x][yy - 1];
        for (let x = 0; x < COLS; x++) this.board[x][0] = -1;
        this.lines++;
        this.score += this.level * 100;
        if (this.lines % 5 === 0) this.level++;
        AudioManager.get().playSfx('step');
        y++;
      }
    }
    this.scoreText.setText(`Lines: ${this.lines}`);
    this.levelText.setText(`Level: ${this.level}`);
  }

  private movePiece(dx: number): boolean {
    if (!this.piece) return false;
    if (!this.collides(this.piece.x + dx, this.piece.y, this.piece.shape)) {
      this.piece.x += dx;
      return true;
    }
    return false;
  }

  private moveDown(): boolean {
    if (!this.piece) return false;
    if (!this.collides(this.piece.x, this.piece.y + 1, this.piece.shape)) {
      this.piece.y++;
      return true;
    }
    return false;
  }

  private rotatePiece(): void {
    if (!this.piece) return;
    const shape = this.piece.shape;
    const rotated = shape[0].map((_, i) => shape.map(r => r[i]).reverse());
    // Wall kick
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!this.collides(this.piece.x + k, this.piece.y, rotated)) {
        this.piece.x += k;
        this.piece.shape = rotated;
        return;
      }
    }
  }

  private hardDrop(): void {
    while (this.moveDown()) { this.score += 2; }
    this.lockPiece();
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.statusText.setText(this.paused ? 'PAUSED' : '');
    this.statusText.setAlpha(this.paused ? 1 : 0);
    this.statusText.setColor('#88aacc');
  }

  private collides(x: number, y: number, shape: number[][]): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const bx = x + c, by = y + r;
          if (bx < 0 || bx >= COLS || by >= ROWS) return true;
          if (by >= 0 && this.board[bx][by] !== -1) return true;
        }
      }
    }
    return false;
  }

  private render(): void {
    this.boardGfx.clear();
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (this.board[x][y] !== -1) {
          this.drawCell(this.boardGfx, GRID_X + x * CELL, GRID_Y + y * CELL, this.board[x][y], 0.8);
        }
      }
    }

    this.pieceGfx.clear();
    if (this.piece && !this.gameOver) {
      for (let r = 0; r < this.piece.shape.length; r++) {
        for (let c = 0; c < this.piece.shape[r].length; c++) {
          if (this.piece.shape[r][c]) {
            this.drawCell(this.pieceGfx, GRID_X + (this.piece.x + c) * CELL, GRID_Y + (this.piece.y + r) * CELL, this.piece.type, 1);
          }
        }
      }
    }

    this.nextGfx.clear();
    const nshape = SHAPES[this.nextType];
    const nx = GRID_X + COLS * CELL + 30;
    const ny = 130;
    for (let r = 0; r < nshape.length; r++) {
      for (let c = 0; c < nshape[r].length; c++) {
        if (nshape[r][c]) {
          this.drawCell(this.nextGfx, nx + c * 18, ny + r * 18, this.nextType, 0.8, 18);
        }
      }
    }
  }

  private drawCell(g: Phaser.GameObjects.Graphics, x: number, y: number, type: number, alpha: number, size = CELL): void {
    const color = COLORS[type] || 0x888888;
    g.fillStyle(color, alpha);
    g.fillRect(x + 1, y + 1, size - 2, size - 2);
    g.fillStyle(0xffffff, alpha * 0.2);
    g.fillRect(x + 1, y + 1, size - 2, 3);
    g.fillRect(x + 1, y + 1, 3, size - 2);
    g.fillStyle(0x000000, alpha * 0.15);
    g.fillRect(x + size - 4, y + 1, 3, size - 2);
    g.fillRect(x + 1, y + size - 4, size - 2, 3);
  }

  private showGameOver(): void {
    AudioManager.get().playSfx('interact');
    this.statusText.setText(`GAME OVER\nLines: ${this.lines}`);
    this.statusText.setAlpha(1);
    this.statusText.setColor('#ff6644');
    this.time.delayedCall(2500, () => this.returnToPark());
  }

  private returnToPark(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('ProjectParkScene'));
  }
}
