import Phaser from 'phaser';
import { getBio } from '../data/bioLoader';
import { AudioManager } from '../systems/AudioManager';

const CELL = 30;
const COLS = 24;
const ROWS = 18;
const GRID_X = 40;
const GRID_Y = 50;
const MOVE_INTERVAL = 180;
const MIN_INTERVAL = 80;

const CAT_COLORS: Record<string, number> = {
  'Frontend': 0x44ccff, 'Backend': 0x44ff88, 'Databases': 0xff4488,
  'DevOps': 0xff8844, 'Languages': 0xff44ff, 'Game Dev': 0xffaa44, 'AI/ML': 0xaa44ff,
};

interface Point { x: number; y: number; }
interface SkillFood { category: string; skill: string; color: number; }

export class SnakeGameScene extends Phaser.Scene {
  private snake: Point[] = [];
  private direction: Point = { x: 1, y: 0 };
  private nextDir: Point = { x: 1, y: 0 };
  private food: Point | null = null;
  private foodSkill: SkillFood | null = null;
  private skillsQueue: SkillFood[] = [];
  private collected: string[] = [];
  private totalSkills = 0;
  private moveTimer = 0;
  private interval = MOVE_INTERVAL;
  private gameOver = false;
  private victory = false;
  private occupied: boolean[][] = [];
  private headGfx!: Phaser.GameObjects.Graphics;
  private bodyGfx!: Phaser.GameObjects.Graphics;
  private foodGfx!: Phaser.GameObjects.Graphics;
  private foodText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'SnakeGameScene' });
  }

  create(): void {
    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = null;
    this.foodSkill = null;
    this.collected = [];
    this.moveTimer = 0;
    this.interval = MOVE_INTERVAL;
    this.gameOver = false;
    this.victory = false;

    // Init occupied grid
    this.occupied = [];
    for (let x = 0; x < COLS; x++) {
      this.occupied[x] = [];
      for (let y = 0; y < ROWS; y++) this.occupied[x][y] = false;
    }

    // Build skills queue
    const bio = getBio();
    this.skillsQueue = [];
    for (const [cat, skills] of Object.entries(bio.skills)) {
      const color = CAT_COLORS[cat] || 0x88aaff;
      for (const skill of skills) {
        this.skillsQueue.push({ category: cat, skill, color });
      }
    }
    Phaser.Utils.Array.Shuffle(this.skillsQueue);
    this.totalSkills = this.skillsQueue.length;

    // Draw grid background
    this.gridGfx = this.add.graphics();
    this.gridGfx.fillStyle(0x0f1f0f, 1);
    this.gridGfx.fillRect(GRID_X, GRID_Y, COLS * CELL, ROWS * CELL);
    this.gridGfx.lineStyle(1, 0x1a3a1a, 0.5);
    for (let x = 0; x <= COLS; x++) {
      this.gridGfx.beginPath();
      this.gridGfx.moveTo(GRID_X + x * CELL, GRID_Y);
      this.gridGfx.lineTo(GRID_X + x * CELL, GRID_Y + ROWS * CELL);
      this.gridGfx.strokePath();
    }
    for (let y = 0; y <= ROWS; y++) {
      this.gridGfx.beginPath();
      this.gridGfx.moveTo(GRID_X, GRID_Y + y * CELL);
      this.gridGfx.lineTo(GRID_X + COLS * CELL, GRID_Y + y * CELL);
      this.gridGfx.strokePath();
    }

    // Spawn initial snake (3 segments at center-left, facing right)
    const startX = Math.floor(COLS / 4);
    const startY = Math.floor(ROWS / 2);
    for (let i = 2; i >= 0; i--) {
      this.snake.push({ x: startX - i, y: startY });
      this.occupied[startX - i][startY] = true;
    }

    // Graphics layers
    this.bodyGfx = this.add.graphics().setDepth(2);
    this.headGfx = this.add.graphics().setDepth(3);
    this.foodGfx = this.add.graphics().setDepth(4);
    this.foodText = this.add.text(0, 0, '', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    // UI
    const title = this.add.text(GRID_X, 5, '✦ SKILL SNAKE ✦', {
      fontSize: '14px', color: '#88ff88', fontFamily: 'monospace', fontStyle: 'bold',
    }).setDepth(10);
    this.scoreText = this.add.text(GRID_X, 22, '', {
      fontSize: '11px', color: '#aaffaa', fontFamily: 'monospace',
    }).setDepth(10);
    this.statusText = this.add.text(400, 300, '', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    // Keys
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    kb.on('keydown-ESC', () => this.returnToWorld());

    this.spawnFood();
    this.renderUI();
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    // Direction input
    this.handleInput();

    // Move timer
    this.moveTimer += delta;
    if (this.moveTimer < this.interval) return;
    this.moveTimer = 0;

    // Apply buffered direction
    this.direction = { ...this.nextDir };

    // Calculate new head position
    const head = this.snake[this.snake.length - 1];
    const nx = head.x + this.direction.x;
    const ny = head.y + this.direction.y;

    // Collision: walls
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      this.endGame();
      return;
    }

    // Collision: self (skip tail if we're about to eat and it will move)
    const willEat = this.food && nx === this.food.x && ny === this.food.y;
    for (let i = willEat ? 0 : 1; i < this.snake.length; i++) {
      if (this.snake[i].x === nx && this.snake[i].y === ny) {
        this.endGame();
        return;
      }
    }

    // Move snake
    this.snake.push({ x: nx, y: ny });
    this.occupied[nx][ny] = true;

    if (willEat) {
      this.collectFood();
    } else {
      const tail = this.snake.shift()!;
      this.occupied[tail.x][tail.y] = false;
    }

    // Render
    this.renderGrid();
    this.renderUI();
  }

  private handleInput(): void {
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const up = this.cursors.up.isDown || this.keyW.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;

    if (left && this.direction.x !== 1) this.nextDir = { x: -1, y: 0 };
    else if (right && this.direction.x !== -1) this.nextDir = { x: 1, y: 0 };
    else if (up && this.direction.y !== 1) this.nextDir = { x: 0, y: -1 };
    else if (down && this.direction.y !== -1) this.nextDir = { x: 0, y: 1 };
  }

  private spawnFood(): void {
    if (this.skillsQueue.length === 0) {
      this.victory = true;
      this.showVictory();
      return;
    }

    // Find empty cells
    const empty: Point[] = [];
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!this.occupied[x][y]) empty.push({ x, y });
      }
    }
    if (empty.length === 0) { this.endGame(); return; }

    const pos = empty[Math.floor(Math.random() * empty.length)];
    this.food = pos;
    this.foodSkill = this.skillsQueue.shift()!;
    this.renderFood();
  }

  private collectFood(): void {
    if (!this.foodSkill) return;
    AudioManager.get().playSfx('step');
    this.collected.push(this.foodSkill.skill);
    this.interval = Math.max(MIN_INTERVAL, MOVE_INTERVAL - this.collected.length * 2);

    // Show floating text
    const ft = this.add.text(
      GRID_X + this.food!.x * CELL + CELL / 2,
      GRID_Y + this.food!.y * CELL,
      `+${this.foodSkill.skill.slice(0, 8)}`, {
        fontSize: '12px', color: '#ffff44', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      },
    ).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: ft, y: ft.y - 30, alpha: 0, duration: 800,
      onComplete: () => ft.destroy(),
    });

    this.food = null;
    this.foodSkill = null;
    this.spawnFood();
  }

  private renderGrid(): void {
    this.bodyGfx.clear();
    // Body segments
    for (let i = 1; i < this.snake.length - 1; i++) {
      const seg = this.snake[i];
      const t = i / (this.snake.length || 1);
      const r = Math.floor(0x22 * (1 - t * 0.5));
      const g = Math.floor(0xcc * (1 - t * 0.4));
      const b = Math.floor(0x44 * (1 - t * 0.5));
      const color = (r << 16) | (g << 8) | b;
      this.bodyGfx.fillStyle(color, 1);
      this.bodyGfx.fillRect(GRID_X + seg.x * CELL + 2, GRID_Y + seg.y * CELL + 2, CELL - 4, CELL - 4);
    }
    // Tail
    if (this.snake.length > 1) {
      const tail = this.snake[0];
      this.bodyGfx.fillStyle(0x225522, 1);
      this.bodyGfx.fillRect(GRID_X + tail.x * CELL + 3, GRID_Y + tail.y * CELL + 3, CELL - 6, CELL - 6);
    }

    // Head
    this.headGfx.clear();
    if (this.snake.length > 0) {
      const head = this.snake[this.snake.length - 1];
      const hx = GRID_X + head.x * CELL;
      const hy = GRID_Y + head.y * CELL;
      this.headGfx.fillStyle(0x44ff66, 1);
      this.headGfx.fillRoundedRect(hx + 1, hy + 1, CELL - 2, CELL - 2, 4);
      // Eyes
      this.headGfx.fillStyle(0xffffff, 1);
      const ex = this.direction.x === 1 ? 6 : this.direction.x === -1 ? CELL - 10 : CELL / 2 - 3;
      const ey = this.direction.y === 1 ? 6 : this.direction.y === -1 ? CELL - 10 : CELL / 2 - 3;
      this.headGfx.fillCircle(hx + ex, hy + 4, 3);
      this.headGfx.fillCircle(hx + ex + (this.direction.x !== 0 ? 0 : 6), hy + 4, 3);
    }
  }

  private renderFood(): void {
    this.foodGfx.clear();
    this.foodText.setVisible(false);
    if (!this.food || !this.foodSkill) return;

    const fx = GRID_X + this.food.x * CELL;
    const fy = GRID_Y + this.food.y * CELL;
    const color = this.foodSkill.color;

    // Glow
    this.foodGfx.fillStyle(color, 0.2);
    this.foodGfx.fillCircle(fx + CELL / 2, fy + CELL / 2, CELL * 0.7);
    // Body
    this.foodGfx.fillStyle(color, 0.9);
    this.foodGfx.fillCircle(fx + CELL / 2, fy + CELL / 2, CELL * 0.35);

    // Skill name label
    const label = this.foodSkill.skill.length > 6
      ? this.foodSkill.skill.slice(0, 5) + '…'
      : this.foodSkill.skill;
    this.foodText.setText(label);
    this.foodText.setPosition(fx + CELL / 2, fy + CELL / 2 + 1);
    this.foodText.setVisible(true);
  }

  private renderUI(): void {
    const pct = this.totalSkills > 0 ? Math.round(this.collected.length / this.totalSkills * 100) : 0;
    this.scoreText.setText(
      `Skills: ${this.collected.length}/${this.totalSkills} (${pct}%)  Length: ${this.snake.length}`,
    );
  }

  private showVictory(): void {
    this.statusText.setText('✦ ALL SKILLS COLLECTED! ✦');
    this.statusText.setAlpha(1);
    this.statusText.setColor('#44ff88');
    this.time.delayedCall(3000, () => this.returnToWorld());
  }

  private endGame(): void {
    this.gameOver = true;
    AudioManager.get().playSfx('interact');
    this.statusText.setText('GAME OVER');
    this.statusText.setAlpha(1);
    this.statusText.setColor('#ff4444');
    this.time.delayedCall(2000, () => this.returnToWorld());
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('SkillGardenScene');
    });
  }
}
