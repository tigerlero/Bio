import Phaser from 'phaser';
import { loadBio, getBio } from '../data/bioLoader';
import { ModalPanel } from '../ui/ModalPanel';
import { AudioManager } from '../systems/AudioManager';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InteractionButton } from '../ui/InteractionButton';

const CAT_COLORS: Record<string, number> = {
  'Frontend': 0x44ccff,
  'Backend': 0x44ff88,
  'Databases': 0xff4488,
  'DevOps': 0xff8844,
  'Languages': 0xff44ff,
  'Game Dev': 0xffaa44,
  'AI/ML': 0xaa44ff,
};

const CAT_ICON_KEY: Record<string, string> = {
  'Frontend': 'icon_frontend',
  'Backend': 'icon_backend',
  'Databases': 'icon_databases',
  'DevOps': 'icon_devops',
  'Languages': 'icon_languages',
  'Game Dev': 'icon_gamedev',
  'AI/ML': 'icon_aiml',
};

interface SkillGem {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  name: string;
  category: string;
  x: number;
  y: number;
}

interface GardenBed {
  cat: string;
  skills: string[];
  bx: number;
  by: number;
  bw: number;
  bh: number;
  gems: SkillGem[];
  header: Phaser.GameObjects.Text;
}

export class SkillGardenScene extends Phaser.Scene {
  private bio = loadBio();
  private playerSprite!: Phaser.GameObjects.Sprite;
  private lastDir = 'down';
  private beds: GardenBed[] = [];
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
    super({ key: 'SkillGardenScene' });
  }

  create(): void {
    this.bio = getBio();
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const worldW = 1200;
    const worldH = 1000;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Background grass
    const ground = this.add.graphics();
    ground.fillStyle(0x1a2a1a, 1);
    ground.fillRect(0, 0, worldW, worldH);

    // Garden paths
    const paths = this.add.graphics();
    paths.lineStyle(24, 0x3a4a3a, 0.3);
    // Vertical main path
    paths.beginPath();
    paths.moveTo(worldW / 2, 0);
    paths.lineTo(worldW / 2, worldH);
    paths.strokePath();
    // Horizontal paths
    for (let y = 220; y < worldH; y += 260) {
      paths.beginPath();
      paths.moveTo(0, y);
      paths.lineTo(worldW, y);
      paths.strokePath();
    }

    // Garden beds with skills
    this.beds = [];
    const categories = Object.entries(this.bio.skills);
    const cols = 3;
    const bedW = 340;
    const bedH = 190;
    const startX = (worldW - cols * bedW) / 2;
    const startY = 50;

    categories.forEach(([cat, skills], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * bedW;
      const by = startY + row * (bedH + 40);
      const color = CAT_COLORS[cat] || 0x88aaff;

      // Garden bed background
      const bed = this.add.graphics();
      bed.fillStyle(color, 0.08);
      bed.fillRoundedRect(bx, by, bedW, bedH, 8);
      bed.lineStyle(1, color, 0.25);
      bed.strokeRoundedRect(bx, by, bedW, bedH, 8);

      // Category header
      const header = this.add.text(bx + bedW / 2, by + 14, cat, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Skill gems
      const gems: SkillGem[] = [];
      const perRow = 4;
      const gemSpacingX = Math.min(70, (bedW - 20) / perRow);
      const gemStartX = bx + (bedW - gemSpacingX * Math.min(perRow, skills.length)) / 2 + gemSpacingX / 2;
      const gemY = by + 50;

      skills.forEach((skill, si) => {
        const col2 = si % perRow;
        const row2 = Math.floor(si / perRow);
        const gx = gemStartX + col2 * gemSpacingX;
        const gy = gemY + row2 * 40;

        // Icon sprite
        const iconKey = CAT_ICON_KEY[cat] || 'icon_frontend';
        const sprite = this.add.sprite(gx, gy, iconKey).setDepth(5);

        // Name label
        const label = this.add.text(gx, gy + 14, skill, {
          fontSize: '8px', color: '#cccccc', fontFamily: 'monospace',
        }).setOrigin(0.5);

        // Gentle float tween
        this.tweens.add({
          targets: sprite, y: gy - 2, duration: 1200 + Math.random() * 800,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        gems.push({ sprite, label, name: skill, category: cat, x: gx, y: gy });
      });

      this.beds.push({ cat, skills, bx, by, bw: bedW, bh: bedH, gems, header });
    });

    // Return portal
    const portalX = worldW / 2;
    const portalY = worldH - 40;
    let portal = this.add.graphics();
    portal.fillStyle(0x44ff88, 0.5);
    portal.fillCircle(portalX, portalY, 18);
    portal.lineStyle(2, 0x44ff88, 0.8);
    portal.strokeCircle(portalX, portalY, 18);
    this.add.text(portalX, portalY, 'R', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(portalX, portalY + 24, 'Return', {
      fontSize: '10px', color: '#44ff88', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Snake game portal
    const snakePortalX = worldW / 2 - 80;
    const snakePortalY = worldH - 40;
    portal = this.add.graphics();
    portal.fillStyle(0x44ff44, 0.4);
    portal.fillCircle(snakePortalX, snakePortalY, 16);
    portal.lineStyle(2, 0x44ff44, 0.7);
    portal.strokeCircle(snakePortalX, snakePortalY, 16);
    this.add.text(snakePortalX, snakePortalY, 'S', {
      fontSize: '14px', color: '#44ff44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(snakePortalX, snakePortalY + 22, 'Snake', {
      fontSize: '9px', color: '#44ff44', fontFamily: 'monospace',
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

    this.px = worldW / 2;
    this.py = worldH - 80;
    this.cameras.main.startFollow(this.playerSprite, true, 0.08, 0.08);

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
    }).setOrigin(0.5).setDepth(30);
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
    this.px = Phaser.Math.Clamp(this.px, 20, 1200 - 20);
    this.py = Phaser.Math.Clamp(this.py, 20, 1000 - 20);
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

    // Check skill proximity
    let nearGem: SkillGem | null = null;
    let nearReturn = false;
    let nearSnake = false;

    for (const bed of this.beds) {
      for (const gem of bed.gems) {
        if (Phaser.Math.Distance.Between(this.px, this.py, gem.x, gem.y) < 40) {
          nearGem = gem;
          break;
        }
      }
      if (nearGem) break;
    }

    const portalX = 1200 / 2;
    const portalY = 1000 - 40;
    if (Phaser.Math.Distance.Between(this.px, this.py, portalX, portalY) < 40) {
      nearReturn = true;
    }

    const snakePortalX = portalX - 80;
    if (Phaser.Math.Distance.Between(this.px, this.py, snakePortalX, portalY) < 35) {
      nearSnake = true;
    }

    const interact = Phaser.Input.Keyboard.JustDown(this.keyE) || this.interactBtn.justPressed;
    if (nearGem && interact) {
      AudioManager.get().playSfx('interact');
      this.openModal(nearGem);
    }

    if (nearReturn && interact) {
      this.returnToWorld();
    }

    if (nearSnake && interact) {
      AudioManager.get().stopBgm(0.2);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.start('SnakeGameScene');
      });
    }

    if (nearReturn) {
      this.prompt.setText('Press E to return');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearSnake) {
      this.prompt.setText('Press E: Skill Snake');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearGem) {
      this.prompt.setText(`Press E: ${nearGem.category} — ${nearGem.name}`);
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private openModal(gem: SkillGem): void {
    if (!this.modal) this.modal = new ModalPanel(this);
    this.modal.show(`#${gem.name}\n#Category: ${gem.category}\n\nUsed in projects and daily development.`);
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('OverworldScene');
    });
  }
}
