import Phaser from 'phaser';
import { loadBio, getBio } from '../data/bioLoader';
import type { Project } from '../data/bio';
import { ModalPanel } from '../ui/ModalPanel';
import { AudioManager } from '../systems/AudioManager';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InteractionButton } from '../ui/InteractionButton';

export class ProjectParkScene extends Phaser.Scene {
  private bio = loadBio();
  private playerSprite!: Phaser.GameObjects.Sprite;
  private lastDir = 'down';
  private buildings: { project: Project; bx: number; by: number; techLabels: Phaser.GameObjects.Text[] }[] = [];
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
  private joystick!: VirtualJoystick;
  private interactBtn!: InteractionButton;
  private isMobile = false;

  constructor() {
    super({ key: 'ProjectParkScene' });
  }

  create(): void {
    this.bio = getBio();
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const ground = this.add.graphics();
    ground.fillStyle(0x1a2a3a, 1);
    ground.fillRect(0, 0, width, height);

    // Grid lines for tech park feel
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x335577, 0.15);
    for (let x = 0; x < width; x += 48) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
      grid.strokePath();
    }
    for (let y = 0; y < height; y += 48) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(width, y);
      grid.strokePath();
    }

    const title = this.add.text(width / 2, 10, 'Project Park', {
      fontSize: '18px', color: '#44aaff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildings = [];
    const projects = this.bio.projects;
    const cols = Math.min(3, projects.length);
    const spacingX = Math.min(180, (width - 80) / cols);
    const spacingY = 140;
    const startX = (width - spacingX * (cols - 1)) / 2;
    const startY = 120;

    projects.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * spacingX;
      const by = startY + row * spacingY;

      const building = this.add.graphics();
      // Main structure
      building.fillStyle(0x4488aa, 0.7);
      building.fillRoundedRect(bx - 28, by - 20, 56, 40, 4);
      building.lineStyle(1, 0x66bbdd, 0.6);
      building.strokeRoundedRect(bx - 28, by - 20, 56, 40, 4);
      // Accent line
      building.fillStyle(0x66bbdd, 0.3);
      building.fillRect(bx - 24, by - 16, 48, 6);

      // Antenna
      building.lineStyle(2, 0x88ccff, 0.4);
      building.beginPath();
      building.moveTo(bx, by - 20);
      building.lineTo(bx, by - 30);
      building.strokePath();
      building.fillStyle(0xff4466, 0.8);
      building.fillCircle(bx, by - 32, 2);

      // Tech badges
      const techLabels: Phaser.GameObjects.Text[] = [];
      const techs = p.tech || [];
      techs.forEach((tech, ti) => {
        const label = this.add.text(bx - 40 + (ti % 2) * 55, by + 26 + Math.floor(ti / 2) * 16, tech, {
          fontSize: '9px', color: '#88ddff', fontFamily: 'monospace',
          backgroundColor: '#224466aa', padding: { x: 3, y: 1 },
        }).setOrigin(0.5);
        techLabels.push(label);
      });

      this.buildings.push({ project: p, bx, by, techLabels });
    });

    // Return portal
    const portalX = width / 2;
    const portalY = height - 40;
    const portal = this.add.graphics();
    portal.fillStyle(0x4488ff, 0.5);
    portal.fillCircle(portalX, portalY, 18);
    portal.lineStyle(2, 0x4488ff, 0.8);
    portal.strokeCircle(portalX, portalY, 18);
    const portalR = this.add.text(portalX, portalY, 'R', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(portalX, portalY + 24, 'Return', {
      fontSize: '10px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Project Match portal
    const matchPortalX = portalX - 80;
    const matchPortal = this.add.graphics();
    matchPortal.fillStyle(0x4488ff, 0.4);
    matchPortal.fillCircle(matchPortalX, portalY, 16);
    matchPortal.lineStyle(2, 0x4488ff, 0.7);
    matchPortal.strokeCircle(matchPortalX, portalY, 16);
    this.add.text(matchPortalX, portalY, 'M', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(matchPortalX, portalY + 22, 'Match', {
      fontSize: '9px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Tetris portal
    const tetrisPX = portalX + 80;
    const tetrisPortal = this.add.graphics();
    tetrisPortal.fillStyle(0x4488ff, 0.4);
    tetrisPortal.fillCircle(tetrisPX, portalY, 16);
    tetrisPortal.lineStyle(2, 0x4488ff, 0.7);
    tetrisPortal.strokeCircle(tetrisPX, portalY, 16);
    this.add.text(tetrisPX, portalY, 'T', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(tetrisPX, portalY + 22, 'Tetris', {
      fontSize: '9px', color: '#4488ff', fontFamily: 'monospace',
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

    // Mobile controls
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.joystick = new VirtualJoystick(this);
    this.interactBtn = new InteractionButton(this);
    if (this.isMobile) {
      this.joystick.show();
      this.interactBtn.show();
    }

    this.prompt = this.add.text(0, 0, '', {
      fontSize: '12px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);
  }

  update(_time: number, delta: number): void {
    this.interactBtn.update();

    let vx = 0;
    let vy = 0;
    const dt = delta / 1000;

    if (this.isMobile && this.joystick.isActive()) {
      const len = Math.sqrt(this.joystick.dx * this.joystick.dx + this.joystick.dy * this.joystick.dy);
      if (len > 0.2) {
        vx = (this.joystick.dx / len) * this.speed;
        vy = (this.joystick.dy / len) * this.speed;
      }
    } else {
      if (this.keyA.isDown) vx = -this.speed;
      else if (this.keyD.isDown) vx = this.speed;
      if (this.keyW.isDown) vy = -this.speed;
      else if (this.keyS.isDown) vy = this.speed;
    }

    this.px += vx * dt;
    this.py += vy * dt;

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

    let nearProject: Project | null = null;
    let nearReturn = false;
    let nearMatch = false;
    let nearTetris = false;

    for (const b of this.buildings) {
      const dx = this.px - b.bx;
      const dy = this.py - b.by;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        nearProject = b.project;
        break;
      }
    }

    const { width: w, height: h } = this.scale;
    const portalX = w / 2;
    const portalY = h - 40;
    if (Phaser.Math.Distance.Between(this.px, this.py, portalX, portalY) < 30) {
      nearReturn = true;
    }

    const nearPortal = (px: number, py: number, dist: number) => Phaser.Math.Distance.Between(this.px, this.py, px, py) < dist;
    const matchPX = portalX - 80;
    const tetrisPX = portalX + 80;
    if (nearPortal(matchPX, portalY, 25)) nearMatch = true;
    if (nearPortal(tetrisPX, portalY, 25)) nearTetris = true;

    const interact = Phaser.Input.Keyboard.JustDown(this.keyE) || this.interactBtn.justPressed;
    if (nearProject && interact) {
      AudioManager.get().playSfx('interact');
      this.openModal(nearProject);
    }

    if (nearReturn && interact) {
      this.returnToWorld();
    }

    if (nearMatch && interact) {
      AudioManager.get().stopBgm(0.2);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('ProjectMatchScene'));
    }

    if (nearTetris && interact) {
      AudioManager.get().stopBgm(0.2);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('TetrisProjectScene'));
    }

    if (nearReturn) {
      this.prompt.setText('Press E to return');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearMatch) {
      this.prompt.setText('Press E: Project Match');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearTetris) {
      this.prompt.setText('Press E: Tetris Projects');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearProject) {
      this.prompt.setText('Press E for details');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private openModal(p: Project): void {
    if (!this.modal) this.modal = new ModalPanel(this);
    this.modal.show(`# ${p.title}\n${p.description}\n\nTech: ${p.tech.join(', ')}\n\nLink: ${p.link}`);
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('OverworldScene');
    });
  }
}
