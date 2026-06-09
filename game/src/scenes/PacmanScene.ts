import Phaser from 'phaser';
import { getBio } from '../data/bioLoader';
import { AudioManager } from '../systems/AudioManager';

const CELL = 26;
const COLS = 28;
const ROWS = 20;
const GRID_X = 36;
const GRID_Y = 40;

const SKILL_COLORS: Record<string, number> = {
  'Frontend': 0x44ccff, 'Backend': 0x44ff88, 'Databases': 0xff4488,
  'DevOps': 0xff8844, 'Languages': 0xff44ff, 'Game Dev': 0xffaa44, 'AI/ML': 0xaa44ff,
};

const GHOST_COLORS = [0xff4444, 0x44aaff, 0xff88ff, 0x44ff88];
const GHOST_NAMES = ['Frontend', 'Backend', 'Databases', 'DevOps'];

const MAZE_DATA = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W............WW............W',
  'W.WWWW.WWWW.WW.WWWW.WWWW.W',
  'W*WWWW.WWWW.WW.WWWW.WWWW*W',
  'W..........................W',
  'W.WWWW.WW.WWWWWW.WW.WWWW.W',
  'W......WW....WW....WW......W',
  'WWWWWW.WWWWW WW WWWWW.WWWWWW',
  '     W.WWWWW WW WWWWW.W     ',
  '     W.WW          WW.W     ',
  '     W.WW WWWWWWWW WW.W     ',
  'WWWWWW.WW WW    WW WW.WWWWWW',
  '                                ',
  'WWWWWW.WW WWWWWWWW WW.WWWWWW',
  '     W.WW          WW.W     ',
  '     W.WW WWWWWWWW WW.W     ',
  '     W.WW WWWWWWWW WW.W     ',
  'WWWWWW.WW WWWWWWWW WW.WWWWWW',
  'W*.........................*W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
];

interface Point { x: number; y: number; }

interface Ghost {
  x: number; y: number;
  startX: number; startY: number;
  color: number;
  name: string;
  mode: 'chase' | 'scatter' | 'frightened' | 'leaving';
  dir: Point;
  gfx: Phaser.GameObjects.Graphics;
  scatterTarget: Point;
  releaseTimer: number;
  released: boolean;
  eatenTimer: number;
}

export class PacmanScene extends Phaser.Scene {
  private pacman!: Phaser.GameObjects.Graphics;
  private pmX = 0;
  private pmY = 0;
  private pmDir: Point = { x: 0, y: 0 };
  private nextDir: Point = { x: 0, y: 0 };

  private ghosts: Ghost[] = [];
  private hasDot: boolean[][] = [];
  private hasPower: boolean[][] = [];
  private skillPositions: Point[] = [];
  private totalSkills = 0;
  private collected = 0;

  private frightTimer = 0;
  private score = 0;
  private gameOver = false;
  private won = false;
  private lives = 3;
  private level = 0;

  private mazeGfx!: Phaser.GameObjects.Graphics;
  private skillGfx!: Phaser.GameObjects.Graphics;
  private uiText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private scorePopup!: Phaser.GameObjects.Text;
  private escKey!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  private moveTimer = 0;
  private readonly MOVE_INTERVAL = 140;
  private ghostMoveTimer = 0;
  private readonly GHOST_INTERVAL = 220;
  private readonly PM_START: Point = { x: 14, y: 15 };
  private readonly GHOST_HOUSE: Point = { x: 13, y: 9 };

  private mouthAngle = 0;
  private mouthDir = 1;
  private birthTimer = 0;

  constructor() {
    super({ key: 'PacmanScene' });
  }

  create(): void {
    this.pmX = this.PM_START.x;
    this.pmY = this.PM_START.y;
    this.pmDir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    this.ghosts = [];
    this.collected = 0;
    this.score = 0;
    this.frightTimer = 0;
    this.gameOver = false;
    this.won = false;
    this.moveTimer = 0;
    this.ghostMoveTimer = 0;
    this.mouthAngle = 0;
    this.mouthDir = 1;
    this.birthTimer = 1500;

    this.parseMaze();
    this.buildMazeGraphics();
    this.skillGfx = this.add.graphics().setDepth(2);
    this.renderSkills();

    this.pacman = this.add.graphics().setDepth(4);
    this.drawPacman();

    this.spawnGhosts();
    this.buildUI();
  }

  private parseMaze(): void {
    this.hasDot = [];
    this.hasPower = [];
    this.skillPositions = [];
    for (let y = 0; y < ROWS; y++) {
      this.hasDot[y] = [];
      this.hasPower[y] = [];
      for (let x = 0; x < COLS; x++) {
        const ch = MAZE_DATA[y]?.[x] || 'W';
        this.hasDot[y][x] = ch === '.';
        this.hasPower[y][x] = ch === '*';
        if (ch === '.') this.skillPositions.push({ x, y });
      }
    }
    this.totalSkills = this.skillPositions.length;
  }

  private buildMazeGraphics(): void {
    this.mazeGfx = this.add.graphics();

    const bgColor = 0x0a0a1a;
    this.mazeGfx.fillStyle(bgColor, 1);
    this.mazeGfx.fillRect(GRID_X - 4, GRID_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = MAZE_DATA[y]?.[x] || 'W';
        if (ch !== 'W') continue;
        const cx = GRID_X + x * CELL;
        const cy = GRID_Y + y * CELL;
        this.mazeGfx.fillStyle(0x1a2a5a, 1);
        this.mazeGfx.fillRect(cx, cy, CELL, CELL);

        const u = MAZE_DATA[y - 1]?.[x];
        const d = MAZE_DATA[y + 1]?.[x];
        const l = MAZE_DATA[y]?.[x - 1];
        const r = MAZE_DATA[y]?.[x + 1];
        this.mazeGfx.lineStyle(2, 0x4488cc, 0.9);
        if (!u || u === 'W') { this.mazeGfx.beginPath(); this.mazeGfx.moveTo(cx, cy); this.mazeGfx.lineTo(cx + CELL, cy); this.mazeGfx.strokePath(); }
        if (!d || d === 'W') { this.mazeGfx.beginPath(); this.mazeGfx.moveTo(cx, cy + CELL); this.mazeGfx.lineTo(cx + CELL, cy + CELL); this.mazeGfx.strokePath(); }
        if (!l || l === 'W') { this.mazeGfx.beginPath(); this.mazeGfx.moveTo(cx, cy); this.mazeGfx.lineTo(cx, cy + CELL); this.mazeGfx.strokePath(); }
        if (!r || r === 'W') { this.mazeGfx.beginPath(); this.mazeGfx.moveTo(cx + CELL, cy); this.mazeGfx.lineTo(cx + CELL, cy + CELL); this.mazeGfx.strokePath(); }
      }
    }
  }

  private buildUI(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    kb.on('keydown-ESC', () => this.returnToWorld());

    this.uiText = this.add.text(GRID_X, 8, '', {
      fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace',
    }).setDepth(10);

    this.statusText = this.add.text(400, 300, '', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.scorePopup = this.add.text(0, 0, '', {
      fontSize: '16px', color: '#ffdd44', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15).setAlpha(0);

    this.renderUI();
  }

  private spawnGhosts(): void {
    const ghostPositions: Point[] = [
      { x: 11, y: 9 }, { x: 14, y: 9 }, { x: 12, y: 9 }, { x: 16, y: 9 },
    ];
    for (let i = 0; i < 4; i++) {
      const sp = ghostPositions[i];
      const gfx = this.add.graphics().setDepth(4);
      const ghost: Ghost = {
        x: sp.x, y: sp.y,
        startX: sp.x, startY: sp.y,
        color: GHOST_COLORS[i],
        name: GHOST_NAMES[i],
        mode: i === 0 ? 'leaving' : 'leaving',
        dir: { x: 0, y: -1 },
        gfx,
        scatterTarget: [
          { x: 1, y: 1 }, { x: COLS - 2, y: 1 },
          { x: 1, y: ROWS - 2 }, { x: COLS - 2, y: ROWS - 2 },
        ][i],
        releaseTimer: 500 + i * 800,
        released: false,
        eatenTimer: 0,
      };
      this.ghosts.push(ghost);
      this.drawGhost(ghost);
    }
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    if (this.birthTimer > 0) {
      this.birthTimer -= delta;
      if (this.birthTimer <= 0) this.birthTimer = 0;
    }

    this.handleInput();

    this.moveTimer += delta;
    if (this.moveTimer >= this.MOVE_INTERVAL) {
      this.moveTimer = 0;
      this.movePacman();
    }

    this.ghostMoveTimer += delta;
    if (this.ghostMoveTimer >= this.GHOST_INTERVAL) {
      this.ghostMoveTimer = 0;
      for (const ghost of this.ghosts) this.updateGhost(ghost, delta);
    }

    if (this.frightTimer > 0) {
      this.frightTimer -= delta;
      if (this.frightTimer <= 0) {
        this.frightTimer = 0;
        for (const ghost of this.ghosts) {
          if (ghost.mode === 'frightened') ghost.mode = 'chase';
        }
      }
    }

    this.mouthAngle += this.mouthDir * delta * 0.005;
    if (this.mouthAngle > 0.35 || this.mouthAngle < 0) this.mouthDir *= -1;

    this.drawPacman();
    for (const ghost of this.ghosts) this.drawGhost(ghost);
    this.renderUI();
  }

  private handleInput(): void {
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const up = this.cursors.up.isDown || this.keyW.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;

    if (left) this.nextDir = { x: -1, y: 0 };
    else if (right) this.nextDir = { x: 1, y: 0 };
    else if (up) this.nextDir = { x: 0, y: -1 };
    else if (down) this.nextDir = { x: 0, y: 1 };
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    const ch = MAZE_DATA[y]?.[x] || 'W';
    return ch !== 'W';
  }

  private movePacman(): void {
    if (this.birthTimer > 0) return;

    const tryDir = (d: Point) => {
      const nx = this.pmX + d.x;
      const ny = this.pmY + d.y;
      return this.isWalkable(nx, ny);
    };

    if (tryDir(this.nextDir)) {
      this.pmDir = { ...this.nextDir };
      this.pmX += this.pmDir.x;
      this.pmY += this.pmDir.y;
    } else if (tryDir(this.pmDir)) {
      this.pmX += this.pmDir.x;
      this.pmY += this.pmDir.y;
    }

    if (this.pmX < 0) this.pmX = COLS - 1;
    else if (this.pmX >= COLS) this.pmX = 0;

    if (this.hasDot[this.pmY][this.pmX]) {
      this.hasDot[this.pmY][this.pmX] = false;
      this.collected++;
      this.score += 10;
      this.showScore(this.pmX, this.pmY, '+10');
      AudioManager.get().playSfx('step');
      this.renderSkills();
      if (this.collected >= this.totalSkills) this.win();
    }

    if (this.hasPower[this.pmY][this.pmX]) {
      this.hasPower[this.pmY][this.pmX] = false;
      this.score += 50;
      this.frightTimer = 7000;
      this.showScore(this.pmX, this.pmY, '+50 POWER');
      for (const ghost of this.ghosts) {
        if (ghost.mode !== 'frightened' && ghost.mode !== 'leaving') {
          ghost.mode = 'frightened';
        }
      }
      AudioManager.get().playSfx('step');
      this.renderSkills();
    }
  }

  private updateGhost(ghost: Ghost, delta: number): void {
    if (ghost.eatenTimer > 0) {
      ghost.eatenTimer -= delta;
      if (ghost.eatenTimer <= 0) {
        ghost.mode = 'leaving';
        ghost.releaseTimer = 100;
        ghost.released = false;
        ghost.eatenTimer = 0;
      }
      return;
    }
    if (ghost.mode === 'leaving') {
      ghost.releaseTimer -= delta;
      if (ghost.releaseTimer <= 0 && !ghost.released) {
        ghost.released = true;
        ghost.mode = 'scatter';
        ghost.x = this.GHOST_HOUSE.x;
        ghost.y = this.GHOST_HOUSE.y;
        ghost.dir = { x: 0, y: 1 };
      }
      return;
    }

    if (ghost.mode === 'frightened') {
      const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
      const rev = { x: -ghost.dir.x, y: -ghost.dir.y };
      const valid = dirs.filter(d =>
        (d.x !== rev.x || d.y !== rev.y) && this.isWalkable(ghost.x + d.x, ghost.y + d.y)
      );
      if (valid.length > 0) {
        const chosen = valid[Math.floor(Math.random() * valid.length)];
        ghost.dir = chosen;
        ghost.x += chosen.x;
        ghost.y += chosen.y;
      }
    } else {
      let target: Point;
      if (ghost.mode === 'scatter') {
        target = ghost.scatterTarget;
      } else {
        // Distinct chase AI per ghost
        const idx = this.ghosts.indexOf(ghost);
        if (idx === 0) {
          // Red: directly chase
          target = { x: this.pmX, y: this.pmY };
        } else if (idx === 1) {
          // Blue: target 4 tiles ahead
          const ahead = { x: this.pmX + this.pmDir.x * 4, y: this.pmY + this.pmDir.y * 4 };
          const vec = { x: ahead.x - ghost.x, y: ahead.y - ghost.y };
          const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
          target = len > 0
            ? { x: ghost.x + Math.round(vec.x / len * 2), y: ghost.y + Math.round(vec.y / len * 2) }
            : { x: this.pmX, y: this.pmY };
        } else if (idx === 2) {
          // Pink: alternate chase / scatter every 8 moves
          target = Math.floor(Date.now() / 4000) % 2 === 0
            ? { x: this.pmX, y: this.pmY }
            : ghost.scatterTarget;
        } else {
          // Green: target the tile furthest from pacman
          target = {
            x: COLS - 1 - this.pmX,
            y: ROWS - 1 - this.pmY,
          };
        }
      }
      this.moveGhostToward(ghost, target);
    }

    if (ghost.x < 0) ghost.x = COLS - 1;
    else if (ghost.x >= COLS) ghost.x = 0;
    if (ghost.y < 0) ghost.y = ROWS - 1;
    else if (ghost.y >= ROWS) ghost.y = 0;

    if (ghost.x === this.pmX && ghost.y === this.pmY && !this.gameOver && this.birthTimer <= 0) {
      if (ghost.mode === 'frightened') {
        ghost.mode = 'leaving';
        ghost.eatenTimer = 200;
        ghost.x = ghost.startX;
        ghost.y = ghost.startY;
        ghost.dir = { x: 0, y: -1 };
        this.score += 200;
        this.showScore(this.pmX, this.pmY, '+200 EATEN!');
        AudioManager.get().playSfx('step');
      } else {
        this.loseLife();
      }
    }
  }

  private moveGhostToward(ghost: Ghost, target: Point): void {
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    const rev = { x: -ghost.dir.x, y: -ghost.dir.y };
    const valid = dirs.filter(d =>
      (d.x !== rev.x || d.y !== rev.y) && this.isWalkable(ghost.x + d.x, ghost.y + d.y)
    );
    if (valid.length === 0) valid.push(rev);
    let best = valid[0];
    let bestDist = Infinity;
    for (const d of valid) {
      const dist = Phaser.Math.Distance.Between(ghost.x + d.x, ghost.y + d.y, target.x, target.y);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    ghost.dir = best;
    ghost.x += best.x;
    ghost.y += best.y;
  }

  private drawPacman(): void {
    this.pacman.clear();
    const cx = GRID_X + this.pmX * CELL + CELL / 2;
    const cy = GRID_Y + this.pmY * CELL + CELL / 2;
    const r = CELL * 0.42;

    const mouth = this.birthTimer > 0 ? 0 : this.mouthAngle;
    let sa = 0, ea = Math.PI * 2;
    if (this.pmDir.x === 1) { sa = mouth; ea = Math.PI * 2 - mouth; }
    else if (this.pmDir.x === -1) { sa = Math.PI + mouth; ea = Math.PI * 2 + Math.PI - mouth; }
    else if (this.pmDir.y === -1) { sa = Math.PI * -0.5 + mouth; ea = Math.PI * 1.5 - mouth; }
    else if (this.pmDir.y === 1) { sa = Math.PI * 0.5 + mouth; ea = Math.PI * 2.5 - mouth; }

    this.pacman.fillStyle(0xffff44, 1);
    this.pacman.beginPath();
    this.pacman.moveTo(cx, cy);
    this.pacman.arc(cx, cy, r, sa, ea, false);
    this.pacman.closePath();
    this.pacman.fillPath();
  }

  private drawGhost(ghost: Ghost): void {
    ghost.gfx.clear();
    if (ghost.eatenTimer > 0) return;

    const cx = GRID_X + ghost.x * CELL + CELL / 2;
    const cy = GRID_Y + ghost.y * CELL + CELL / 2;
    const r = CELL * 0.38;

    let color = ghost.color;
    if (ghost.mode === 'frightened') {
      color = this.frightTimer < 2000 && Math.floor(Date.now() / 200) % 2 === 0 ? 0xffffff : 0x4444ff;
    }
    if (ghost.mode === 'leaving' && ghost.released) color = 0x888888;

    ghost.gfx.fillStyle(color, 1);
    ghost.gfx.fillCircle(cx, cy - 2, r);
    ghost.gfx.fillRect(cx - r, cy - 2, r * 2, r * 0.7);

    if (ghost.mode !== 'leaving' || !ghost.released) {
      const wavy = (ghost.x * 3 + ghost.y * 7 + Date.now() * 0.003) % (Math.PI * 2);
      for (let i = 0; i < 3; i++) {
        const wx = cx - r + (r * 2 / 3) * i + r / 3;
        const wy = cy + r * 0.2 + Math.sin(wavy + i * 1.5) * 2.5;
        ghost.gfx.fillCircle(wx, wy, 2.5);
      }
    }

    const eyeOffX = ghost.dir.x * 1.5;
    const eyeOffY = ghost.dir.y * 1.5;
    ghost.gfx.fillStyle(0xffffff, 1);
    ghost.gfx.fillCircle(cx - 3.5, cy - 3, 3);
    ghost.gfx.fillCircle(cx + 3.5, cy - 3, 3);
    if (ghost.mode === 'frightened') {
      ghost.gfx.fillStyle(0xff4444, 0.9);
      ghost.gfx.fillCircle(cx - 3.5, cy - 3, 1.2);
      ghost.gfx.fillCircle(cx + 3.5, cy - 3, 1.2);
    } else {
      ghost.gfx.fillStyle(0x0000aa, 1);
      ghost.gfx.fillCircle(cx - 3.5 + eyeOffX, cy - 3 + eyeOffY, 1.5);
      ghost.gfx.fillCircle(cx + 3.5 + eyeOffX, cy - 3 + eyeOffY, 1.5);
    }
  }

  private renderSkills(): void {
    this.skillGfx.clear();
    const catKeys = Object.keys(SKILL_COLORS);
    const catVals = Object.values(SKILL_COLORS);

    for (const s of this.skillPositions) {
      if (!this.hasDot[s.y][s.x]) continue;
      const cx = GRID_X + s.x * CELL + CELL / 2;
      const cy = GRID_Y + s.y * CELL + CELL / 2;
      const ci = Math.floor((s.x + s.y * 7) % catKeys.length);
      this.skillGfx.fillStyle(catVals[ci], 0.9);
      this.skillGfx.fillCircle(cx, cy, 2.5);
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!this.hasPower[y][x]) continue;
        const cx = GRID_X + x * CELL + CELL / 2;
        const cy = GRID_Y + y * CELL + CELL / 2;
        const pulse = Math.sin(Date.now() * 0.004 + x + y) * 0.3 + 0.7;
        this.skillGfx.fillStyle(0xffaa44, pulse);
        this.skillGfx.fillCircle(cx, cy, 7);
        this.skillGfx.fillStyle(0xffdd88, pulse * 0.3);
        this.skillGfx.fillCircle(cx, cy, 11);
      }
    }
  }

  private renderUI(): void {
    const hearts = '❤️'.repeat(this.lives);
    const fright = this.frightTimer > 0 ? ` ⚠ ${Math.ceil(this.frightTimer / 1000)}s` : '';
    this.uiText.setText(`${hearts}  Skills: ${this.collected}/${this.totalSkills}  Score: ${this.score}${fright}`);
    if (this.birthTimer > 0) {
      this.uiText.setText(`${hearts}  ${Math.ceil(this.birthTimer / 1000)}...  Skills: ${this.collected}/${this.totalSkills}`);
    }
  }

  private showScore(gx: number, gy: number, text: string): void {
    this.scorePopup.setText(text);
    this.scorePopup.setPosition(GRID_X + gx * CELL + CELL / 2, GRID_Y + gy * CELL);
    this.scorePopup.setAlpha(1);
    this.tweens.add({
      targets: this.scorePopup,
      y: this.scorePopup.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
    });
  }

  private loseLife(): void {
    if (this.gameOver) return;
    this.lives--;
    if (this.lives <= 0) { this.lose(); return; }
    this.birthTimer = 1500;
    this.pmX = this.PM_START.x;
    this.pmY = this.PM_START.y;
    this.pmDir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    for (const ghost of this.ghosts) {
      ghost.x = ghost.startX;
      ghost.y = ghost.startY;
      ghost.dir = { x: 0, y: -1 };
      ghost.mode = 'leaving';
      ghost.releaseTimer = 500 + this.ghosts.indexOf(ghost) * 400;
      ghost.released = false;
      ghost.eatenTimer = 0;
    }
    AudioManager.get().playSfx('interact');
  }

  private win(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.won = true;
    this.statusText.setText('✦ ALL SKILLS COLLECTED! ✦');
    this.statusText.setAlpha(1);
    this.statusText.setColor('#44ff88');
    this.time.delayedCall(3000, () => this.returnToWorld());
  }

  private lose(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    AudioManager.get().playSfx('interact');
    this.statusText.setText('GAME OVER — CAUGHT BY A JOB');
    this.statusText.setAlpha(1);
    this.statusText.setColor('#ff4444');
    this.time.delayedCall(2000, () => this.returnToWorld());
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('SkillGardenScene'));
  }
}
