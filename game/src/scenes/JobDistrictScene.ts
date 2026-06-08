import Phaser from 'phaser';
import { loadBio, getBio } from '../data/bioLoader';
import type { Job } from '../data/bio';
import { ModalPanel } from '../ui/ModalPanel';
import { AudioManager } from '../systems/AudioManager';

export class JobDistrictScene extends Phaser.Scene {
  private bio = loadBio();
  private playerSprite!: Phaser.GameObjects.Sprite;
  private lastDir = 'down';
  private buildings: { job: Job; bx: number; by: number; logo: Phaser.GameObjects.Image | null }[] = [];
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private px = 400;
  private py = 500;
  private speed = 100;
  private modal: ModalPanel | null = null;
  private prompt!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'JobDistrictScene' });
  }

  create(): void {
    this.bio = getBio();
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const ground = this.add.graphics();
    ground.fillStyle(0x2a2a2a, 1);
    ground.fillRect(0, 0, width, height);

    // Street
    const street = this.add.graphics();
    street.fillStyle(0x444444, 1);
    street.fillRect(0, height * 0.4 - 24, width, 48);
    street.lineStyle(2, 0x888800, 0.4);
    for (let x = 0; x < width; x += 30) {
      street.beginPath();
      street.moveTo(x, height * 0.4 - 2);
      street.lineTo(x + 12, height * 0.4 - 2);
      street.strokePath();
      street.beginPath();
      street.moveTo(x, height * 0.4 + 24);
      street.lineTo(x + 12, height * 0.4 + 24);
      street.strokePath();
    }

    const title = this.add.text(width / 2, 10, 'Job District', {
      fontSize: '18px', color: '#ffaa44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    const jobLogoMap: Record<string, string> = {
      'Valmore-Neogen': 'logo_valmore',
      'ExpressTransfers': 'logo_expresstransfers',
      'Evalion-SHL': 'logo_evalion',
      'Newdeal Real Estates': 'logo_newdeal',
      'Datawise': 'logo_datawise',
    };

    this.buildings = [];
    const jobs = this.bio.jobs;
    const cols = 3;
    const spacingX = Math.min(180, (width - 80) / cols);
    const startX = (width - spacingX * (Math.min(cols, jobs.length) - 1)) / 2;
    const startY = 100;

    jobs.forEach((j, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const bx = startX + col * spacingX;
      const by = startY + row * 160;

      const building = this.add.graphics();
      // Building body
      building.fillStyle(0x556677, 0.8);
      building.fillRect(bx - 30, by - 24, 60, 48);
      building.lineStyle(1, 0x88aabb, 0.5);
      building.strokeRect(bx - 30, by - 24, 60, 48);
      // Windows
      for (let wy = by - 14; wy < by + 18; wy += 16) {
        for (let wx = bx - 20; wx < bx + 16; wx += 20) {
          building.fillStyle(0x88ccff, 0.4);
          building.fillRect(wx, wy, 10, 8);
        }
      }

      // Logo
      const logoKey = jobLogoMap[j.company];
      let logo: Phaser.GameObjects.Image | null = null;
      if (logoKey && this.textures.exists(logoKey)) {
        const tex = this.textures.get(logoKey);
        const h = tex.getSourceImage().height;
        const scale = 20 / h;
        logo = this.add.image(bx, by + 30, logoKey).setScale(scale).setDepth(1);
      }

      const label = this.add.text(bx, by + 40 + (logo ? 12 : 0), j.company, {
        fontSize: '10px', color: '#ffaa44', fontFamily: 'monospace',
        backgroundColor: '#00000088', padding: { x: 2, y: 1 },
      }).setOrigin(0.5);

      this.buildings.push({ job: j, bx, by, logo });
    });

    // Return portal
    const portalX = width / 2;
    const portalY = height - 40;
    const portal = this.add.graphics();
    portal.fillStyle(0xff8844, 0.5);
    portal.fillCircle(portalX, portalY, 18);
    portal.lineStyle(2, 0xff8844, 0.8);
    portal.strokeCircle(portalX, portalY, 18);
    this.add.text(portalX, portalY, 'R', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(portalX, portalY + 24, 'Return', {
      fontSize: '10px', color: '#ff8844', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Player
    this.playerSprite = this.add.sprite(this.px, this.py, 'player_sheet').setDepth(20).play('player_idle_down');

    const kb = this.input.keyboard!;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    kb.on('keydown-ESC', () => this.returnToWorld());

    this.px = width / 2;
    this.py = height * 0.7;

    this.prompt = this.add.text(0, 0, '', {
      fontSize: '12px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);
  }

  update(): void {
    let vx = 0;
    let vy = 0;
    if (this.keyA.isDown) vx = -this.speed;
    else if (this.keyD.isDown) vx = this.speed;
    if (this.keyW.isDown) vy = -this.speed;
    else if (this.keyS.isDown) vy = this.speed;

    this.px += vx / 60;
    this.py += vy / 60;

    const { width, height } = this.scale;
    this.px = Phaser.Math.Clamp(this.px, 20, width - 20);
    this.py = Phaser.Math.Clamp(this.py, 60, height - 60);

    this.playerSprite.setPosition(this.px, this.py);

    if (vx !== 0 || vy !== 0) {
      let dir = this.lastDir;
      if (vy < 0) dir = 'up';
      else if (vy > 0) dir = 'down';
      else if (vx < 0) dir = 'left';
      else if (vx > 0) dir = 'right';
      this.lastDir = dir;
      this.playerSprite.play(`player_walk_${dir}`, true);
    } else {
      this.playerSprite.play(`player_idle_${this.lastDir}`, true);
    }

    let nearJob: Job | null = null;
    let nearReturn = false;

    for (const b of this.buildings) {
      const dx = this.px - b.bx;
      const dy = this.py - b.by;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        nearJob = b.job;
        break;
      }
    }

    const { width: w, height: h } = this.scale;
    const portalX = w / 2;
    const portalY = h - 40;
    if (Phaser.Math.Distance.Between(this.px, this.py, portalX, portalY) < 30) {
      nearReturn = true;
    }

    if (nearJob && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      AudioManager.get().playSfx('interact');
      this.openModal(nearJob);
    }

    if (nearReturn && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.returnToWorld();
    }

    if (nearReturn) {
      this.prompt.setText('Press E to return');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearJob) {
      this.prompt.setText('Press E for details');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private openModal(j: Job): void {
    if (!this.modal) this.modal = new ModalPanel(this);
    this.modal.show(`# ${j.company}\n${j.role} | ${j.period}\n\n${j.highlights.map((h) => `• ${h}`).join('\n')}`);
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('OverworldScene');
    });
  }
}
