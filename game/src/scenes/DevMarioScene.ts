import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const GRAVITY = 900;
const JUMP_VEL = -420;
const MOVE_SPEED = 180;
const FOCUS_SPEED = 240;
const WORLD_W = 5200;
const WORLD_H = 600;
const GROUND_Y = 536;
const FOCUS_DURATION = 18000;

interface EnemyData {
  body: Phaser.Physics.Arcade.Body;
  gfx: Phaser.GameObjects.Graphics;
  minX: number; maxX: number;
  dir: number;
  isDeadline: boolean;
  alive: boolean;
}

interface Plat { x: number; y: number; w: number; h: number }

interface Chamber {
  entranceX: number; entranceY: number;
  exitX: number; exitY: number;
  floor: Plat[]; walls: Plat[]; platforms: Plat[];
  bytePositions: { x: number; y: number }[];
}

interface CoinObj { gfx: Phaser.GameObjects.Graphics; x: number; y: number; collected: boolean }

export class DevMarioScene extends Phaser.Scene {
  private playerGfx!: Phaser.GameObjects.Graphics;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: EnemyData[] = [];
  private coins: CoinObj[] = [];
  private byteGfx: Phaser.GameObjects.Graphics[] = [];
  private bytePositions: { x: number; y: number }[] = [];

  private promptText!: Phaser.GameObjects.Text;
  private overlayGfx!: Phaser.GameObjects.Graphics;
  private uiScoreText!: Phaser.GameObjects.Text;
  private playerBody!: Phaser.GameObjects.Rectangle;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;

  private score = 0;
  private lives = 3;
  private gameOver = false;
  private won = false;
  private focusMode = false;
  private focusTimer = 0;
  private focusChamber = -1;
  private respawnX = 80;
  private respawnY = 400;

  private chambers: Chamber[] = [];
  private pipes: { x: number; y: number; h: number }[] = [];
  private exitPipePos: { x: number; y: number } | null = null;
  private groundPlats: Plat[] = [];
  private floatPlats: Plat[] = [];

  constructor() {
    super({ key: 'DevMarioScene' });
  }

  create(): void {
    this.score = 0; this.lives = 3;
    this.gameOver = false; this.won = false;
    this.focusMode = false; this.focusTimer = 0; this.focusChamber = -1;
    this.respawnX = 80; this.respawnY = GROUND_Y - 13;
    this.enemies = []; this.coins = [];
    this.byteGfx = []; this.bytePositions = [];
    this.exitPipePos = null;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.physics.world.gravity.y = GRAVITY;
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.buildLevel();
    this.buildBackground();
    this.buildPlatforms();
    this.buildCoins();
    this.buildPipes();
    this.buildChambers();
    this.buildFlag();
    this.buildPlayer();
    this.buildEnemies();
    this.physics.add.collider(this.playerBody, this.platforms);

    this.promptText = this.add.text(0, 0, '', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#00000088', padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(25).setVisible(false);

    this.overlayGfx = this.add.graphics().setDepth(15).setScrollFactor(0).setAlpha(0);

    this.uiScoreText = this.add.text(80, 16, '', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setDepth(30).setScrollFactor(0);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    kb.on('keydown-ESC', () => this.returnToWorld());
  }

  private buildLevel(): void {
    this.groundPlats = [
      { x: 0, y: GROUND_Y, w: 640, h: 64 },
      { x: 700, y: GROUND_Y, w: 256, h: 64 },
      { x: 1050, y: GROUND_Y, w: 320, h: 64 },
      { x: 1500, y: GROUND_Y, w: 256, h: 64 },
      { x: 1900, y: GROUND_Y, w: 320, h: 64 },
      { x: 2360, y: GROUND_Y, w: 960, h: 64 },
      { x: 3450, y: GROUND_Y, w: 320, h: 64 },
      { x: 3900, y: GROUND_Y, w: 1100, h: 64 },
    ];
    this.floatPlats = [
      { x: 280, y: 380, w: 96, h: 18 }, { x: 480, y: 310, w: 96, h: 18 },
      { x: 760, y: 370, w: 128, h: 18 }, { x: 1100, y: 340, w: 96, h: 18 },
      { x: 1350, y: 300, w: 128, h: 18 }, { x: 1600, y: 360, w: 96, h: 18 },
      { x: 2000, y: 320, w: 96, h: 18 }, { x: 2250, y: 380, w: 96, h: 18 },
      { x: 2550, y: 320, w: 128, h: 18 }, { x: 2850, y: 270, w: 96, h: 18 },
      { x: 3150, y: 340, w: 96, h: 18 }, { x: 3500, y: 300, w: 128, h: 18 },
      { x: 4050, y: 320, w: 128, h: 18 }, { x: 4350, y: 270, w: 96, h: 18 },
      { x: 4650, y: 340, w: 96, h: 18 },
    ];
    this.pipes = [
      { x: 820, y: GROUND_Y - 64, h: 64 },
      { x: 2100, y: GROUND_Y - 96, h: 96 },
      { x: 3300, y: GROUND_Y - 64, h: 64 },
    ];
    this.chambers = [
      {
        entranceX: 820, entranceY: GROUND_Y - 64, exitX: 1100, exitY: GROUND_Y,
        floor: [{ x: 690, y: GROUND_Y + 130, w: 220, h: 32 }],
        walls: [{ x: 690, y: GROUND_Y + 40, w: 16, h: 90 }, { x: 894, y: GROUND_Y + 40, w: 16, h: 90 }],
        platforms: [{ x: 760, y: GROUND_Y + 80, w: 80, h: 16 }],
        bytePositions: [{ x: 730, y: GROUND_Y + 110 }, { x: 800, y: GROUND_Y + 110 }, { x: 850, y: GROUND_Y + 70 }],
      },
      {
        entranceX: 2100, entranceY: GROUND_Y - 96, exitX: 2400, exitY: GROUND_Y,
        floor: [{ x: 1950, y: GROUND_Y + 160, w: 320, h: 32 }],
        walls: [{ x: 1950, y: GROUND_Y + 50, w: 16, h: 110 }, { x: 2254, y: GROUND_Y + 50, w: 16, h: 110 }],
        platforms: [{ x: 2010, y: GROUND_Y + 100, w: 64, h: 16 }, { x: 2140, y: GROUND_Y + 80, w: 64, h: 16 }],
        bytePositions: [
          { x: 1990, y: GROUND_Y + 90 }, { x: 2050, y: GROUND_Y + 60 },
          { x: 2110, y: GROUND_Y + 130 }, { x: 2180, y: GROUND_Y + 50 }, { x: 2220, y: GROUND_Y + 90 },
        ],
      },
      {
        entranceX: 3300, entranceY: GROUND_Y - 64, exitX: 3600, exitY: GROUND_Y,
        floor: [{ x: 3160, y: GROUND_Y + 150, w: 300, h: 32 }],
        walls: [{ x: 3160, y: GROUND_Y + 40, w: 16, h: 110 }, { x: 3444, y: GROUND_Y + 40, w: 16, h: 110 }],
        platforms: [
          { x: 3220, y: GROUND_Y + 100, w: 64, h: 16 },
          { x: 3320, y: GROUND_Y + 70, w: 64, h: 16 },
          { x: 3420, y: GROUND_Y + 100, w: 64, h: 16 },
        ],
        bytePositions: [
          { x: 3200, y: GROUND_Y + 70 }, { x: 3260, y: GROUND_Y + 60 },
          { x: 3350, y: GROUND_Y + 40 }, { x: 3400, y: GROUND_Y + 70 },
          { x: 3460, y: GROUND_Y + 40 }, { x: 3500, y: GROUND_Y + 90 },
        ],
      },
    ];
  }

  private buildBackground(): void {
    const bg = this.add.graphics().setDepth(-10);
    for (let y = 0; y < WORLD_H; y++) {
      const t = y / WORLD_H;
      const r = Math.floor(68 * (1 - t) + 170 * t);
      const g = Math.floor(136 * (1 - t) + 221 * t);
      const b = Math.floor(204 * (1 - t) + 255 * t);
      bg.fillStyle((r << 16) | (g << 8) | b, 1);
      bg.fillRect(0, y, WORLD_W, 1);
    }
    for (let x = 0; x < WORLD_W; x += 80 + Math.sin(x * 0.01) * 40) {
      bg.fillStyle(0xffffff, 0.06);
      bg.fillRect(x, 30 + Math.sin(x * 0.02) * 50, 40 + Math.sin(x * 0.01) * 20, 2);
    }
  }

  private buildPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    for (const g of this.groundPlats) {
      const r = this.add.rectangle(g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, 0x886644).setDepth(1);
      const color = this.focusMode ? 0x225522 : 0x44aa44;
      this.add.rectangle(g.x + g.w / 2, g.y + 2, g.w, 6, color).setDepth(2);
      this.platforms.add(r);
    }
    for (const p of this.floatPlats) {
      const r = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x885533).setDepth(1);
      this.add.rectangle(p.x + p.w / 2, p.y + 2, p.w, 5, 0x44aa44).setDepth(2);
      this.platforms.add(r);
    }
  }

  private buildCoins(): void {
    const positions = [
      { x: 350, y: 340 }, { x: 380, y: 340 }, { x: 410, y: 340 },
      { x: 540, y: 270 }, { x: 570, y: 270 },
      { x: 820, y: 330 }, { x: 860, y: 330 },
      { x: 1150, y: 300 }, { x: 1180, y: 300 },
      { x: 1400, y: 260 }, { x: 1440, y: 260 },
      { x: 1640, y: 320 }, { x: 1670, y: 320 },
      { x: 2050, y: 280 }, { x: 2080, y: 280 },
      { x: 2600, y: 280 }, { x: 2640, y: 280 }, { x: 2680, y: 280 },
      { x: 2900, y: 230 }, { x: 2930, y: 230 },
      { x: 3550, y: 260 }, { x: 3590, y: 260 },
      { x: 4100, y: 280 }, { x: 4140, y: 280 },
      { x: 4400, y: 230 }, { x: 4430, y: 230 },
    ];
    for (const p of positions) {
      const g = this.add.graphics().setDepth(3);
      g.fillStyle(0xffcc00, 1);
      g.fillCircle(p.x, p.y, 6);
      g.fillStyle(0xffee44, 0.7);
      g.fillCircle(p.x - 1, p.y - 1, 3);
      this.tweens.add({
        targets: { y: p.y },
        y: p.y - 4, duration: 600 + Math.random() * 200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: (tw) => { const v = tw.getValue(); if (v !== null) { g.y = v - p.y; } },
      });
      this.coins.push({ gfx: g, x: p.x, y: p.y, collected: false });
    }
  }

  private buildPipes(): void {
    for (const pipe of this.pipes) {
      const pw = 64;
      const px = pipe.x - pw / 2;
      const g = this.add.graphics().setDepth(2);
      g.fillStyle(0x33aa33, 1);
      g.fillRect(px, pipe.y, pw, pipe.h);
      g.fillStyle(0x227722, 1);
      g.fillRect(px + 4, pipe.y + 4, pw - 8, pipe.h - 4);
      g.fillStyle(0x44cc44, 1);
      g.fillRect(px - 4, pipe.y - 8, pw + 8, 12);
      g.fillStyle(0x226622, 1);
      g.fillRect(px - 4, pipe.y - 8, pw + 8, 3);
      g.fillStyle(0x111111, 0.5);
      g.fillRect(px + 6, pipe.y + 8, pw - 12, pipe.h - 8);
    }
  }

  private buildChambers(): void {
    for (const ch of this.chambers) {
      for (const f of ch.floor) {
        const r = this.add.rectangle(f.x + f.w / 2, f.y + f.h / 2, f.w, f.h, 0x554433).setDepth(1);
        this.add.rectangle(f.x + f.w / 2, f.y + 2, f.w, 5, 0x338833).setDepth(2);
        this.platforms.add(r);
      }
      for (const w of ch.walls) {
        const r = this.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, 0x664422).setDepth(1);
        this.platforms.add(r);
      }
      for (const p of ch.platforms) {
        const r = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x774433).setDepth(1);
        this.add.rectangle(p.x + p.w / 2, p.y + 2, p.w, 4, 0x338833).setDepth(2);
        this.platforms.add(r);
      }
    }
  }

  private buildFlag(): void {
    const fx = WORLD_W - 180;
    const fy = GROUND_Y - 130;
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(4, 0xcccccc, 1);
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, GROUND_Y); g.strokePath();
    g.fillStyle(0xff4444, 1);
    g.fillTriangle(fx + 4, fy + 4, fx + 60, fy + 30, fx + 4, fy + 56);
    this.add.text(fx + 30, fy - 20, 'SPRINT END', {
      fontSize: '10px', color: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);
    this.add.text(WORLD_W - 160, GROUND_Y - 140, 'DEMO', {
      fontSize: '10px', color: '#ff6644', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setDepth(6);
  }

  private buildPlayer(): void {
    this.playerBody = this.add.rectangle(this.respawnX, this.respawnY, 18, 26, 0x4488ff).setDepth(10);
    this.physics.add.existing(this.playerBody);
    const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    this.playerGfx = this.add.graphics().setDepth(11);
    this.cameras.main.startFollow(this.playerBody, true, 0.1, 0.1);
  }

  private get player(): Phaser.GameObjects.Rectangle { return this.playerBody; }

  private drawPlayer(x: number, y: number): void {
    this.playerGfx.clear();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const moving = Math.abs(body.velocity.x) > 5;
    const right = body.velocity.x >= 0;

    this.playerGfx.fillStyle(0x4488ff, 1);
    this.playerGfx.fillRect(x - 9, y - 12, 18, 22);
    this.playerGfx.fillStyle(0x66aaff, 1);
    this.playerGfx.fillRect(x - 7, y - 10, 14, 7);
    this.playerGfx.fillStyle(0xffcc88, 1);
    this.playerGfx.fillCircle(x, y - 16, 7);
    const eo = right ? 2 : -2;
    this.playerGfx.fillStyle(0x000000, 1);
    this.playerGfx.fillCircle(x - 3 + eo, y - 17, 1.5);
    this.playerGfx.fillCircle(x + 3 + eo, y - 17, 1.5);
    const lp = moving ? Math.sin(this.time.now * 0.012) * 4 : 0;
    this.playerGfx.fillStyle(0x224488, 1);
    this.playerGfx.fillRect(x - 7, y + 9, 5, 4 + lp);
    this.playerGfx.fillRect(x + 2, y + 9, 5, 4 - lp);
  }

  private buildEnemies(): void {
    const data = [
      { x: 400, minX: 200, maxX: 550, dl: false },
      { x: 900, minX: 750, maxX: 1050, dl: false },
      { x: 1300, minX: 1100, maxX: 1450, dl: false },
      { x: 1600, minX: 1500, maxX: 1750, dl: true },
      { x: 2700, minX: 2400, maxX: 3200, dl: false },
      { x: 3100, minX: 2900, maxX: 3300, dl: false },
      { x: 3500, minX: 3400, maxX: 3700, dl: true },
      { x: 4200, minX: 3950, maxX: 4700, dl: false },
    ];
    for (const d of data) {
      const sz = d.dl ? 20 : 16;
      const ht = d.dl ? 22 : 16;
      const color = d.dl ? 0xff3344 : 0x66bb33;
      const gfx = this.add.graphics().setDepth(5);
      const r = this.add.rectangle(d.x, GROUND_Y - 8, sz, ht, color).setDepth(4);
      this.physics.add.existing(r);
      const body = r.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setBounce(0);
      this.enemies.push({ body, gfx, minX: d.minX, maxX: d.maxX, dir: -1, isDeadline: d.dl, alive: true });
    }
  }

  private spawnBytes(chamberIdx: number): void {
    this.clearBytes();
    const ch = this.chambers[chamberIdx];
    this.bytePositions = ch.bytePositions.map(b => ({ ...b }));
    for (const bp of this.bytePositions) {
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(0x00ff88, 1);
      g.fillRect(bp.x - 5, bp.y - 5, 10, 10);
      g.fillStyle(0x88ffcc, 0.4);
      g.fillRect(bp.x - 3, bp.y - 3, 6, 6);
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(bp.x - 1, bp.y - 3, 2, 6);
      this.byteGfx.push(g);
    }
  }

  private clearBytes(): void {
    for (const g of this.byteGfx) g.destroy();
    this.byteGfx = [];
    this.bytePositions = [];
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    const p = this.player;
    if (!p || !p.active) return;
    const body = p.body as Phaser.Physics.Arcade.Body;

    this.handleInput(p, body);
    this.updateEnemies(p, body);
    this.updateBackground();
    this.checkCoins(p);
    this.checkBytes(p);
    this.checkPipes(p);
    this.checkDeath(p);
    this.checkFlag(p);
    this.drawPlayer(p.x, p.y);
    this.renderUI(p);
  }

  private handleInput(p: Phaser.GameObjects.Rectangle, body: Phaser.Physics.Arcade.Body): void {
    const speed = this.focusMode ? FOCUS_SPEED : MOVE_SPEED;
    let vx = 0;
    if (this.keyA.isDown || this.cursors.left.isDown) vx = -speed;
    else if (this.keyD.isDown || this.cursors.right.isDown) vx = speed;
    body.setVelocityX(vx);

    if (body.blocked.down || body.touching.down) {
      const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up)
        || Phaser.Input.Keyboard.JustDown(this.keyW)
        || Phaser.Input.Keyboard.JustDown(this.cursors.space);
      if (jump) { body.setVelocityY(JUMP_VEL); AudioManager.get().playSfx('step'); }
    }

    if (this.focusMode && this.exitPipePos) {
      if (Phaser.Input.Keyboard.JustDown(this.keyE)
        && Phaser.Math.Distance.Between(p.x, p.y, this.exitPipePos.x, this.exitPipePos.y) < 60) {
        this.exitFocusMode();
      }
    }

    if (!this.focusMode) {
      for (let i = 0; i < this.pipes.length; i++) {
        const pipe = this.pipes[i];
        if ((Phaser.Input.Keyboard.JustDown(this.keyE) || Phaser.Input.Keyboard.JustDown(this.cursors.down))
          && Phaser.Math.Distance.Between(p.x, p.y, pipe.x, pipe.y) < 50) {
          this.enterFocusMode(i);
          break;
        }
      }
    }
  }

  private enterFocusMode(chamberIdx: number): void {
    this.focusMode = true;
    this.focusTimer = FOCUS_DURATION;
    this.focusChamber = chamberIdx;
    AudioManager.get().playSfx('zoneEnter');

    const ch = this.chambers[chamberIdx];
    this.playerBody.setPosition(ch.entranceX, ch.entranceY - 18);
    (this.playerBody.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.cameras.main.setBounds(ch.entranceX - 200, ch.entranceY - 200, 500, 500);

    this.spawnBytes(chamberIdx);
    this.exitPipePos = { x: ch.exitX, y: ch.exitY };

    const ex = ch.exitX;
    const ey = ch.exitY;
    const eg = this.add.graphics().setDepth(6);
    eg.fillStyle(0x33aa33, 1);
    eg.fillRect(ex - 32, ey - 64, 64, 64);
    eg.fillStyle(0x227722, 1);
    eg.fillRect(ex - 28, ey - 60, 56, 60);
    eg.fillStyle(0x44cc44, 1);
    eg.fillRect(ex - 36, ey - 72, 72, 12);
    eg.fillStyle(0xffffff, 0.4);
    eg.fillRect(ex - 4, ey - 56, 8, 48);
    eg.setData('exitPipe', true);
    this.platforms.add(eg);
  }

  private exitFocusMode(): void {
    this.focusMode = false;
    this.focusTimer = 0;

    const ci = Math.max(0, this.focusChamber);
    const ch = this.chambers[ci];
    const pipeIdx = this.pipes.findIndex(p => p.x === ch.entranceX);
    const returnX = (pipeIdx >= 0 && pipeIdx < this.pipes.length - 1)
      ? this.pipes[pipeIdx + 1].x - 60 : ch.exitX;

    this.focusChamber = -1;
    this.playerBody.setPosition(returnX, ch.exitY - 18);
    (this.playerBody.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.clearBytes();
    this.exitPipePos = null;
  }

  private updateBackground(): void {
    this.overlayGfx.clear();
    if (!this.focusMode) { this.overlayGfx.setAlpha(0); return; }
    this.overlayGfx.setAlpha(1);
    this.overlayGfx.fillStyle(0x000022, 0.7);
    this.overlayGfx.fillRect(0, 0, 800, 600);
    const glow = Math.sin(this.time.now * 0.003) * 0.3 + 0.5;
    this.overlayGfx.fillStyle(0x00ff88, glow * 0.08);
    this.overlayGfx.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 10; i++) {
      const gx = Math.sin(i * 2.1 + this.time.now * 0.001) * 280 + 400;
      const gy = Math.cos(i * 1.7 + this.time.now * 0.0008) * 180 + 300;
      this.overlayGfx.fillStyle(0x00ff88, glow * (0.08 + Math.sin(i) * 0.04));
      this.overlayGfx.fillCircle(gx, gy, 2 + Math.sin(i + this.time.now * 0.002) * 1.5);
    }
  }

  private updateEnemies(p: Phaser.GameObjects.Rectangle, body: Phaser.Physics.Arcade.Body): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const go = e.body.gameObject as Phaser.GameObjects.Rectangle;
      if (!go || !go.active) continue;
      const speed = e.isDeadline ? 80 : 50;
      if (go.x <= e.minX) e.dir = 1;
      else if (go.x >= e.maxX) e.dir = -1;
      e.body.setVelocityX(speed * e.dir);
      this.drawEnemy(e.gfx, go.x, go.y, e.isDeadline);

      if (Phaser.Math.Distance.Between(p.x, p.y, go.x, go.y) < 20) {
        const stomping = body.velocity.y > 0 && body.y + body.height < go.y + go.height * 0.4;
        if (stomping) {
          e.alive = false;
          go.setVisible(false);
          e.gfx.clear();
          body.setVelocityY(JUMP_VEL * 0.7);
          this.score += e.isDeadline ? 200 : 100;
          this.showPopup(go.x, go.y, e.isDeadline ? '+200 DEADLINE!' : '+100 BUG!');
          AudioManager.get().playSfx('step');
        } else if (!this.focusMode) {
          this.loseLife();
        }
      }
    }
  }

  private drawEnemy(gfx: Phaser.GameObjects.Graphics, x: number, y: number, dl: boolean): void {
    gfx.clear();
    if (dl) {
      gfx.fillStyle(0xff3344, 1);
      gfx.fillRect(x - 10, y - 11, 20, 22);
      gfx.fillStyle(0xcc1122, 1);
      gfx.fillRect(x - 8, y - 9, 16, 6);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(x - 7, y - 9, 4, 3); gfx.fillRect(x + 3, y - 9, 4, 3);
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillRect(x - 11, y - 14, 4, 4); gfx.fillRect(x + 7, y - 14, 4, 4);
    } else {
      gfx.fillStyle(0x66bb33, 1);
      gfx.fillEllipse(x, y + 2, 16, 12);
      gfx.fillStyle(0x448822, 1);
      gfx.fillEllipse(x, y + 4, 12, 7);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(x - 3, y - 2, 2); gfx.fillCircle(x + 3, y - 2, 2);
      gfx.fillStyle(0x000000, 1);
      gfx.fillCircle(x - 2, y - 2, 1); gfx.fillCircle(x + 4, y - 2, 1);
      gfx.fillStyle(0x334422, 1);
      gfx.fillRect(x - 7, y - 7, 3, 3); gfx.fillRect(x + 4, y - 7, 3, 3);
    }
  }

  private checkCoins(p: Phaser.GameObjects.Rectangle): void {
    for (const c of this.coins) {
      if (c.collected) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < 20) {
        c.collected = true;
        c.gfx.setVisible(false);
        this.score += 10;
        this.showPopup(c.x, c.y, '+10');
        AudioManager.get().playSfx('step');
      }
    }
  }

  private checkBytes(p: Phaser.GameObjects.Rectangle): void {
    if (!this.focusMode) return;
    for (let i = this.bytePositions.length - 1; i >= 0; i--) {
      const bp = this.bytePositions[i];
      if (Phaser.Math.Distance.Between(p.x, p.y, bp.x, bp.y) < 22) {
        this.score += 50;
        this.showPopup(bp.x, bp.y, '+50 BYTE');
        AudioManager.get().playSfx('step');
        this.byteGfx[i].destroy();
        this.byteGfx.splice(i, 1);
        this.bytePositions.splice(i, 1);
        if (this.bytePositions.length === 0) {
          this.showPopup(p.x, p.y - 30, 'ALL BYTES COLLECTED!');
        }
      }
    }
  }

  private checkPipes(p: Phaser.GameObjects.Rectangle): void {
    if (this.focusMode) { this.promptText.setVisible(false); return; }
    let near = false;
    for (const pipe of this.pipes) {
      if (Phaser.Math.Distance.Between(p.x, p.y, pipe.x, pipe.y) < 50) {
        this.promptText.setText('Press E / Down to enter focus');
        this.promptText.setPosition(pipe.x, pipe.y - 50);
        this.promptText.setVisible(true);
        near = true;
        break;
      }
    }
    if (this.exitPipePos && this.focusMode) {
      const dist = Phaser.Math.Distance.Between(p.x, p.y, this.exitPipePos.x, this.exitPipePos.y);
      if (dist < 60) {
        this.promptText.setText('Press E to exit focus mode');
        this.promptText.setPosition(this.exitPipePos.x, this.exitPipePos.y - 80);
        this.promptText.setVisible(true);
        near = true;
      }
    }
    if (!near) this.promptText.setVisible(false);
  }

  private checkDeath(p: Phaser.GameObjects.Rectangle): void {
    if (p.y > WORLD_H + 80) this.loseLife();
  }

  private checkFlag(p: Phaser.GameObjects.Rectangle): void {
    const fx = WORLD_W - 180;
    const fy = GROUND_Y - 60;
    if (!this.gameOver && !this.won && Phaser.Math.Distance.Between(p.x, p.y, fx, fy) < 50) {
      this.win();
    }
  }

  private loseLife(): void {
    if (this.gameOver) return;
    this.lives--;
    if (this.lives <= 0) { this.lose(); return; }
    if (this.focusMode) this.exitFocusMode();
    AudioManager.get().playSfx('interact');
    const p = this.player;
    p.setPosition(this.respawnX, this.respawnY);
    (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.cameras.main.shake(200, 0.01);
  }

  private showPopup(x: number, y: number, text: string): void {
    const t = this.add.text(x, y, text, {
      fontSize: '12px', color: '#ffdd44', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t, y: y - 25, alpha: 0, duration: 600, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  private win(): void {
    this.gameOver = true; this.won = true;
    AudioManager.get().playSfx('interact');
    this.showLargeText(
      `✦ SPRINT COMPLETE! ✦\nDemo delivered on time!\nScore: ${this.score}`,
      '#44ff88', 5000,
    );
  }

  private lose(): void {
    this.gameOver = true;
    AudioManager.get().playSfx('interact');
    this.showLargeText(`GAME OVER — Missed the sprint!\nScore: ${this.score}`, '#ff4444', 3000);
  }

  private showLargeText(msg: string, color: string, delay: number): void {
    const t = this.add.text(400, 280, msg, {
      fontSize: '22px', color, fontFamily: 'monospace', fontStyle: 'bold',
      align: 'center', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30).setScrollFactor(0);
    this.tweens.add({ targets: t, alpha: 0, duration: 500, delay, onComplete: () => this.returnToWorld() });
  }

  private renderUI(_p: Phaser.GameObjects.Rectangle): void {
    const hearts = '❤️'.repeat(this.lives);
    const mode = this.focusMode ? ' ⚡ FOCUS' : '';
    const timer = this.focusMode ? ` ${Math.ceil(this.focusTimer / 1000)}s` : '';
    this.uiScoreText.setText(`${hearts}  Score: ${this.score}${mode}${timer}`);
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('SkillGardenScene'));
  }
}
