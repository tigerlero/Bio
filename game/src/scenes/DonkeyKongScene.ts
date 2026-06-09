import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const W = 800;
const H = 600;
const GRAVITY = 800;
const JUMP_VEL = -380;
const MOVE_SPEED = 160;
const PLAT_H = 14;
const PLAYER_W = 18;
const PLAYER_H = 24;

interface BugData {
  body: Phaser.Physics.Arcade.Body;
  gfx: Phaser.GameObjects.Graphics;
  alive: boolean;
  dir: number;
  fallTimer: number;
}

interface LadderData {
  x: number; y: number; w: number; h: number;
  topY: number; bottomY: number;
}

interface CoinObj { gfx: Phaser.GameObjects.Graphics; x: number; y: number; collected: boolean }

const ROW_YS = [H - 48, H - 128, H - 208, H - 288, H - 368, H - 448];
const TESTER_Y = ROW_YS[5] - 40;

const PLATS = [
  { y: ROW_YS[0], x: 10, w: 160 }, { y: ROW_YS[0], x: 220, w: 130 }, { y: ROW_YS[0], x: 400, w: 160 }, { y: ROW_YS[0], x: 610, w: 180 },
  { y: ROW_YS[1], x: 50, w: 140 }, { y: ROW_YS[1], x: 240, w: 180 }, { y: ROW_YS[1], x: 480, w: 140 }, { y: ROW_YS[1], x: 660, w: 130 },
  { y: ROW_YS[2], x: 10, w: 130 }, { y: ROW_YS[2], x: 190, w: 160 }, { y: ROW_YS[2], x: 400, w: 170 }, { y: ROW_YS[2], x: 620, w: 170 },
  { y: ROW_YS[3], x: 60, w: 150 }, { y: ROW_YS[3], x: 260, w: 160 }, { y: ROW_YS[3], x: 470, w: 150 }, { y: ROW_YS[3], x: 650, w: 140 },
  { y: ROW_YS[4], x: 10, w: 150 }, { y: ROW_YS[4], x: 210, w: 160 }, { y: ROW_YS[4], x: 420, w: 140 }, { y: ROW_YS[4], x: 600, w: 190 },
  { y: ROW_YS[5], x: 50, w: 160 }, { y: ROW_YS[5], x: 280, w: 240 },
];

const LADDERS: { fromRow: number; toRow: number; x: number }[] = [
  { fromRow: 0, toRow: 1, x: 100 }, { fromRow: 0, toRow: 1, x: 480 },
  { fromRow: 1, toRow: 2, x: 320 }, { fromRow: 1, toRow: 2, x: 550 },
  { fromRow: 2, toRow: 3, x: 140 }, { fromRow: 2, toRow: 3, x: 690 },
  { fromRow: 3, toRow: 4, x: 80 }, { fromRow: 3, toRow: 4, x: 360 },
  { fromRow: 4, toRow: 5, x: 500 },
];

const COINS = [
  { x: 80, y: ROW_YS[0] - 20 }, { x: 280, y: ROW_YS[0] - 14 }, { x: 480, y: ROW_YS[0] - 20 }, { x: 690, y: ROW_YS[0] - 14 },
  { x: 110, y: ROW_YS[1] - 14 }, { x: 320, y: ROW_YS[1] - 20 }, { x: 540, y: ROW_YS[1] - 14 }, { x: 720, y: ROW_YS[1] - 20 },
  { x: 60, y: ROW_YS[2] - 20 }, { x: 270, y: ROW_YS[2] - 14 }, { x: 480, y: ROW_YS[2] - 20 }, { x: 700, y: ROW_YS[2] - 14 },
  { x: 130, y: ROW_YS[3] - 20 }, { x: 340, y: ROW_YS[3] - 14 }, { x: 540, y: ROW_YS[3] - 20 },
  { x: 70, y: ROW_YS[4] - 14 }, { x: 290, y: ROW_YS[4] - 20 }, { x: 490, y: ROW_YS[4] - 14 }, { x: 690, y: ROW_YS[4] - 20 },
];

export class DonkeyKongScene extends Phaser.Scene {
  private playerGfx!: Phaser.GameObjects.Graphics;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private ladders: LadderData[] = [];
  private bugs: BugData[] = [];
  private coins: CoinObj[] = [];
  private uiText!: Phaser.GameObjects.Text;
  private testerGfx!: Phaser.GameObjects.Graphics;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private score = 0;
  private lives = 3;
  private gameOver = false;
  private won = false;
  private climbing = false;
  private currentLadder: LadderData | null = null;
  private bugSpawnTimer = 0;
  private bugSpawnInterval = 1800;

  constructor() {
    super({ key: 'DonkeyKongScene' });
  }

  create(): void {
    this.score = 0; this.lives = 3;
    this.gameOver = false; this.won = false;
    this.climbing = false; this.currentLadder = null;
    this.bugs = []; this.coins = [];
    this.bugSpawnTimer = 0; this.bugSpawnInterval = 1800;

    this.physics.world.setBounds(0, 0, W, H);
    this.physics.world.gravity.y = GRAVITY;
    this.cameras.main.setBackgroundColor('#0a0a1a');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.buildBackground();
    this.buildLadders();
    this.buildPlatforms();
    this.buildTester();
    this.buildCoins();
    this.buildPlayer();
    this.physics.add.collider(this.playerBody, this.platforms);
    this.buildUI();

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    kb.on('keydown-ESC', () => this.returnToWorld());
  }

  private buildBackground(): void {
    const bg = this.add.graphics().setDepth(-10);
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) {
      const t = y / H;
      bg.fillStyle(0x111122, 0.3 + t * 0.5);
      bg.fillRect(0, y, W, 2);
    }
    bg.fillStyle(0x222244, 0.3);
    for (let x = 0; x < W; x += 40) {
      bg.fillRect(x, 0, 1, H);
    }
    for (let y = 0; y < H; y += 40) {
      bg.fillRect(0, y, W, 1);
    }
    this.add.text(W / 2, 14, 'BUG TOWER', {
      fontSize: '16px', color: '#ff6644', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);
  }

  private buildLadders(): void {
    this.ladders = [];
    for (const ld of LADDERS) {
      const fromY = ROW_YS[ld.fromRow];
      const toY = ROW_YS[ld.toRow];
      const ladder: LadderData = {
        x: ld.x - 6, y: toY, w: 12, h: fromY - toY,
        topY: toY, bottomY: fromY,
      };
      this.ladders.push(ladder);

      const g = this.add.graphics().setDepth(0);
      g.fillStyle(0x886644, 0.6);
      g.fillRect(ladder.x, ladder.y, ladder.w, ladder.h);
      g.lineStyle(1, 0xaa8866, 0.4);
      for (let rung = 0; rung < ladder.h; rung += 14) {
        g.beginPath();
        g.moveTo(ladder.x, ladder.y + rung);
        g.lineTo(ladder.x + ladder.w, ladder.y + rung);
        g.strokePath();
      }
    }
  }

  private buildPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    for (const p of PLATS) {
      const r = this.add.rectangle(p.x + p.w / 2, p.y + PLAT_H / 2, p.w, PLAT_H, 0x555577).setDepth(2);
      this.add.rectangle(p.x + p.w / 2, p.y + 2, p.w, 4, 0x8888bb).setDepth(3);
      this.platforms.add(r);
    }
  }

  private buildTester(): void {
    this.testerGfx = this.add.graphics().setDepth(5);
    this.drawTester(W / 2, TESTER_Y);
    this.add.text(W / 2, TESTER_Y - 32, 'THE TESTER', {
      fontSize: '11px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);
  }

  private drawTester(x: number, y: number): void {
    const g = this.testerGfx;
    g.clear();
    g.fillStyle(0xcc3333, 1);
    g.fillRect(x - 14, y - 4, 28, 24);
    g.fillStyle(0xff5555, 1);
    g.fillRect(x - 12, y - 2, 24, 10);
    g.fillStyle(0xffcc88, 1);
    g.fillCircle(x, y - 12, 10);
    g.fillStyle(0x000000, 1);
    g.fillCircle(x - 3, y - 14, 2);
    g.fillCircle(x + 3, y - 14, 2);
    g.fillStyle(0xcc4444, 1);
    g.fillRect(x - 12, y - 16, 4, 6);
    g.fillRect(x + 8, y - 16, 4, 6);
    g.fillStyle(0x888888, 1);
    g.fillRect(x - 16, y + 20, 32, 6);
    g.fillStyle(0x666666, 1);
    g.fillRect(x - 14, y + 22, 28, 4);
  }

  private buildCoins(): void {
    for (const c of COINS) {
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(0xffcc00, 1);
      g.fillCircle(c.x, c.y, 5);
      g.fillStyle(0xffee44, 0.6);
      g.fillCircle(c.x - 1, c.y - 1, 2);
      this.tweens.add({
        targets: { y: c.y }, y: c.y - 4, duration: 500 + Math.random() * 200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: (tw) => { const v = tw.getValue(); if (v !== null) g.y = v - c.y; },
      });
      this.coins.push({ gfx: g, x: c.x, y: c.y, collected: false });
    }
  }

  private buildPlayer(): void {
    const spawnY = ROW_YS[0] - PLAYER_H;
    this.playerBody = this.add.rectangle(80, spawnY, PLAYER_W, PLAYER_H, 0x4488ff).setDepth(10);
    this.physics.add.existing(this.playerBody);
    const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    this.playerGfx = this.add.graphics().setDepth(11);
  }

  private buildUI(): void {
    this.uiText = this.add.text(10, H - 22, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setDepth(30);
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;
    const p = this.playerBody;
    if (!p || !p.active) return;
    const body = p.body as Phaser.Physics.Arcade.Body;

    this.handleInput(p, body, delta);
    this.updateBugs(p, delta);
    this.checkCoins(p);
    this.checkWin(p);
    this.drawPlayer(p.x, p.y);
    this.renderUI();

    if (p.y > H + 40) this.loseLife();
  }

  private handleInput(p: Phaser.GameObjects.Rectangle, body: Phaser.Physics.Arcade.Body, _delta: number): void {
    const onGround = body.blocked.down || body.touching.down;

    if (this.climbing && this.currentLadder) {
      let climbUp = this.cursors.up.isDown || this.keyW.isDown;
      let climbDown = this.cursors.down.isDown || this.keyS.isDown;

      if (climbUp) {
        body.setVelocityY(-120);
        body.setVelocityX(0);
        const topY = this.currentLadder.topY;
        if (p.y <= topY + 4) {
          this.climbing = false;
          this.currentLadder = null;
          body.checkCollision.none = false;
          body.setVelocityY(0);
          body.allowGravity = true;
          p.y = topY - 12;
        }
      } else if (climbDown) {
        body.setVelocityY(120);
        body.setVelocityX(0);
        if (p.y >= this.currentLadder.bottomY - 4) {
          this.climbing = false;
          this.currentLadder = null;
          body.checkCollision.none = false;
          body.setVelocityY(0);
          body.allowGravity = true;
        }
      } else {
        body.setVelocityY(0);
        body.setVelocityX(0);
      }

      const stepOff = this.cursors.left.isDown || this.keyA.isDown || this.cursors.right.isDown || this.keyD.isDown;
      if (!climbUp && !climbDown && stepOff) {
        this.climbing = false;
        this.currentLadder = null;
        body.checkCollision.none = false;
        body.allowGravity = true;
      }
      return;
    }

    body.allowGravity = true;
    let vx = 0;
    if (this.keyA.isDown || this.cursors.left.isDown) vx = -MOVE_SPEED;
    else if (this.keyD.isDown || this.cursors.right.isDown) vx = MOVE_SPEED;
    body.setVelocityX(vx);

    const climbRequest = this.cursors.up.isDown || this.keyW.isDown;
    if (climbRequest) {
      for (const ladder of this.ladders) {
        if (p.x >= ladder.x - 8 && p.x <= ladder.x + ladder.w + 8
          && p.y >= ladder.y - 12 && p.y <= ladder.y + ladder.h + 12) {
          this.climbing = true;
          this.currentLadder = ladder;
          body.allowGravity = false;
          body.checkCollision.none = true;
          body.setVelocity(0, -120);
          p.x = ladder.x + ladder.w / 2;
          break;
        }
      }
    }

    if (onGround && !this.climbing) {
      const jump = Phaser.Input.Keyboard.JustDown(this.cursors.space)
        || (Phaser.Input.Keyboard.JustDown(this.cursors.up) && !climbRequest);
      if (jump) {
        body.setVelocityY(JUMP_VEL);
        AudioManager.get().playSfx('step');
      }
    }
  }

  private spawnBug(): void {
    const spawnX = Phaser.Math.Between(80, W - 80);
    const gfx = this.add.graphics().setDepth(5);
    const r = this.add.rectangle(spawnX, ROW_YS[5] - 10, 14, 12, 0x66bb33).setDepth(4);
    this.physics.add.existing(r);
    const body = r.body as Phaser.Physics.Arcade.Body;
    body.setBounce(0.3);
    body.setCollideWorldBounds(true);
    body.setVelocity(Phaser.Math.Between(-40, 40), 30);
    this.physics.add.collider(r, this.platforms);
    this.bugs.push({ body, gfx, alive: true, dir: 1, fallTimer: 0 });

    if (this.bugSpawnInterval > 600) {
      this.bugSpawnInterval -= 30;
    }
  }

  private updateBugs(p: Phaser.GameObjects.Rectangle, _delta: number): void {
    this.bugSpawnTimer += _delta;
    if (this.bugSpawnTimer >= this.bugSpawnInterval) {
      this.bugSpawnTimer = 0;
      this.spawnBug();
    }

    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      if (!b.alive) continue;
      const go = b.body.gameObject as Phaser.GameObjects.Rectangle;
      if (!go || !go.active) { this.bugs.splice(i, 1); continue; }

      this.drawBug(b.gfx, go.x, go.y);

      if (go.y > H + 20) { this.destroyBug(i); continue; }

      if (Phaser.Math.Distance.Between(p.x, p.y, go.x, go.y) < 18) {
        this.loseLife();
      }
    }
  }

  private drawBug(gfx: Phaser.GameObjects.Graphics, x: number, y: number): void {
    gfx.clear();
    gfx.fillStyle(0x66bb33, 1);
    gfx.fillEllipse(x, y + 1, 14, 10);
    gfx.fillStyle(0x448822, 1);
    gfx.fillEllipse(x, y + 2, 10, 6);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(x - 3, y - 2, 1.5);
    gfx.fillCircle(x + 3, y - 2, 1.5);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(x - 2, y - 2, 0.8);
    gfx.fillCircle(x + 4, y - 2, 0.8);
    gfx.fillStyle(0x334422, 1);
    gfx.fillRect(x - 5, y - 6, 3, 3);
    gfx.fillRect(x + 2, y - 6, 3, 3);
  }

  private destroyBug(idx: number): void {
    const b = this.bugs[idx];
    b.alive = false;
    b.gfx.destroy();
    const go = b.body.gameObject as Phaser.GameObjects.Rectangle;
    if (go) go.destroy();
    this.bugs.splice(idx, 1);
  }

  private checkCoins(p: Phaser.GameObjects.Rectangle): void {
    for (const c of this.coins) {
      if (c.collected) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < 18) {
        c.collected = true;
        c.gfx.setVisible(false);
        this.score += 10;
        this.showPopup(c.x, c.y, '+10');
      }
    }
  }

  private checkWin(p: Phaser.GameObjects.Rectangle): void {
    if (this.won || this.gameOver) return;
    if (p.y < ROW_YS[5] + 20 && Math.abs(p.x - W / 2) < 140) {
      this.win();
    }
  }

  private drawPlayer(x: number, y: number): void {
    this.playerGfx.clear();
    const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
    const moving = Math.abs(body.velocity.x) > 5;
    const right = body.velocity.x >= 0;

    this.playerGfx.fillStyle(0x4488ff, 1);
    this.playerGfx.fillRect(x - 9, y - 12, 18, 24);
    this.playerGfx.fillStyle(0x66aaff, 1);
    this.playerGfx.fillRect(x - 7, y - 10, 14, 8);
    this.playerGfx.fillStyle(0xffcc88, 1);
    this.playerGfx.fillCircle(x, y - 16, 7);
    const eo = right ? 2 : -2;
    this.playerGfx.fillStyle(0x000000, 1);
    this.playerGfx.fillCircle(x - 3 + eo, y - 17, 1.5);
    this.playerGfx.fillCircle(x + 3 + eo, y - 17, 1.5);
    const lp = moving ? Math.sin(this.time.now * 0.012) * 3 : 0;
    this.playerGfx.fillStyle(0x224488, 1);
    this.playerGfx.fillRect(x - 7, y + 10, 5, 3 + lp);
    this.playerGfx.fillRect(x + 2, y + 10, 5, 3 - lp);
  }

  private loseLife(): void {
    if (this.gameOver) return;
    this.lives--;
    if (this.lives <= 0) { this.lose(); return; }
    this.climbing = false;
    this.currentLadder = null;
    const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
    body.checkCollision.none = false;
    body.allowGravity = true;
    AudioManager.get().playSfx('interact');
    this.playerBody.setPosition(80, ROW_YS[0] - PLAYER_H);
    body.setVelocity(0, 0);
    this.cameras.main.shake(200, 0.01);
  }

  private showPopup(x: number, y: number, text: string): void {
    const t = this.add.text(x, y, text, {
      fontSize: '11px', color: '#ffdd44', fontFamily: 'monospace', fontStyle: 'bold',
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
      `✦ TOWER CLEARED! ✦\nYou survived the bugs!\nScore: ${this.score}`,
      '#44ff88', 5000,
    );
  }

  private lose(): void {
    this.gameOver = true;
    AudioManager.get().playSfx('interact');
    this.showLargeText(`GAME OVER — Bugged out!\nScore: ${this.score}`, '#ff4444', 3000);
  }

  private showLargeText(msg: string, color: string, delay: number): void {
    const t = this.add.text(W / 2, H / 2, msg, {
      fontSize: '22px', color, fontFamily: 'monospace', fontStyle: 'bold',
      align: 'center', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, alpha: 0, duration: 500, delay, onComplete: () => this.returnToWorld() });
  }

  private renderUI(): void {
    const hearts = '❤️'.repeat(this.lives);
    this.uiText.setText(`${hearts}  Bugs: ${this.bugs.length}  Score: ${this.score}`);
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('SkillGardenScene'));
  }
}
