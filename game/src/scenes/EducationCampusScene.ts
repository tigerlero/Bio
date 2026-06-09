import Phaser from 'phaser';
import { loadBio, getBio } from '../data/bioLoader';
import type { Education } from '../data/bio';
import { ModalPanel } from '../ui/ModalPanel';
import { AudioManager } from '../systems/AudioManager';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InteractionButton } from '../ui/InteractionButton';

export class EducationCampusScene extends Phaser.Scene {
  private bio = loadBio();
  private playerSprite!: Phaser.GameObjects.Sprite;
  private lastDir = 'down';
  private buildings: { gfx: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; data: Education; bx: number; by: number }[] = [];
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
  private joystick!: VirtualJoystick;
  private interactBtn!: InteractionButton;
  private isMobile = false;

  constructor() {
    super({ key: 'EducationCampusScene' });
  }

  create(): void {
    this.bio = getBio();
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Ground
    const ground = this.add.graphics();
    ground.fillStyle(0x1a3a1a, 1);
    ground.fillRect(0, 0, width, height);

    // Path
    const path = this.add.graphics();
    path.lineStyle(16, 0x8b7355, 0.4);
    path.beginPath();
    path.moveTo(width / 2, height);
    path.lineTo(width / 2, height * 0.4);
    path.strokePath();
    path.lineStyle(12, 0x8b7355, 0.3);
    for (let i = 0; i < this.bio.education.length; i++) {
      const bx = width * 0.2 + i * (width * 0.6 / Math.max(1, this.bio.education.length - 1));
      path.beginPath();
      path.moveTo(width / 2, height * 0.4);
      path.lineTo(bx, height * 0.2);
      path.strokePath();
    }

    // Title
    this.add.text(width / 2, 10, 'Education Campus', {
      fontSize: '18px', color: '#ffaa44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildings = [];
    const bKeys = Object.keys(this.bio.education);
    bKeys.forEach((_, i) => {
      const bx = width * 0.2 + i * (width * 0.6 / Math.max(1, this.bio.education.length - 1));
      const by = height * 0.15;
      const edu = this.bio.education[i];

      const building = this.add.graphics();
      building.fillStyle(0xcc8844, 0.8);
      building.fillRect(bx - 30, by - 30, 60, 60);
      building.lineStyle(2, 0xffaa44, 0.6);
      building.strokeRect(bx - 30, by - 30, 60, 60);
      // Roof
      building.fillStyle(0xaa6633, 0.8);
      building.fillTriangle(bx - 35, by - 30, bx + 35, by - 30, bx, by - 50);

      const label = this.add.text(bx, by + 40, edu.school.split(' ')[0], {
        fontSize: '11px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.buildings.push({ gfx: building, label, data: edu, bx, by });
    });

    // Return portal
    const portalX = width / 2;
    const portalY = height - 40;
    const portal = this.add.graphics();
    portal.fillStyle(0x44cc44, 0.6);
    portal.fillCircle(portalX, portalY, 18);
    portal.lineStyle(2, 0x44cc44, 0.9);
    portal.strokeCircle(portalX, portalY, 18);
    this.add.text(portalX, portalY, 'R', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    const returnLabel =     this.add.text(portalX, portalY + 24, 'Return', {
      fontSize: '10px', color: '#44cc44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Quiz portal
    const quizPX = portalX + 80;
    const quiz = this.add.graphics();
    quiz.fillStyle(0x44cc44, 0.4);
    quiz.fillCircle(quizPX, portalY, 16);
    quiz.lineStyle(2, 0x44cc44, 0.7);
    quiz.strokeCircle(quizPX, portalY, 16);
    this.add.text(quizPX, portalY, 'Q', {
      fontSize: '14px', color: '#44cc44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(quizPX, portalY + 22, 'Quiz', {
      fontSize: '9px', color: '#44cc44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Player
    this.playerSprite = this.add.sprite(this.px, this.py, 'player_sheet').setDepth(20).play('player_idle_down');

    // Keys
    const kb = this.input.keyboard!;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    kb.on('keydown-ESC', () => this.returnToWorld());

    // Go to last education position or center
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

    // Prompt
    this.prompt = this.add.text(0, 0, '', {
      fontSize: '12px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);
  }

  private prompt!: Phaser.GameObjects.Text;

  update(): void {
    this.interactBtn.update();

    let vx = 0;
    let vy = 0;

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

    this.px += vx / 60;
    this.py += vy / 60;

    const { width, height } = this.scale;
    this.px = Phaser.Math.Clamp(this.px, 20, width - 20);
    this.py = Phaser.Math.Clamp(this.py, 60, height - 60);

    this.playerSprite.setPosition(this.px, this.py);

    // Animation
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

    // Check building interaction
    let nearBuilding: Education | null = null;
    let nearReturn = false;
    let nearQuiz = false;

    for (const b of this.buildings) {
      const dx = this.px - b.bx;
      const dy = this.py - b.by;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        nearBuilding = b.data;
        break;
      }
    }

    // Check portals
    const portalX = width / 2;
    const portalY = height - 40;
    if (Phaser.Math.Distance.Between(this.px, this.py, portalX, portalY) < 30) {
      nearReturn = true;
    }
    const quizPX = portalX + 80;
    if (Phaser.Math.Distance.Between(this.px, this.py, quizPX, portalY) < 25) {
      nearQuiz = true;
    }

    const interact = Phaser.Input.Keyboard.JustDown(this.keyE) || this.interactBtn.justPressed;
    if (nearBuilding && interact) {
      AudioManager.get().playSfx('interact');
      this.openModal(nearBuilding);
    }

    if (nearReturn && interact) {
      this.returnToWorld();
    }

    if (nearQuiz && interact) {
      AudioManager.get().stopBgm(0.2);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('CampusQuizScene'));
    }

    // Prompt
    if (nearReturn) {
      this.prompt.setText('Press E to return');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearQuiz) {
      this.prompt.setText('Press E: Campus Quiz');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else if (nearBuilding) {
      this.prompt.setText('Press E for details');
      this.prompt.setPosition(this.px, this.py - 16);
      this.prompt.setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private openModal(edu: Education): void {
    if (!this.modal) this.modal = new ModalPanel(this);
    this.modal.show(`#${edu.degree}\n#${edu.school}\n#Class of ${edu.year}\n${edu.description || 'No description available.'}`);
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('OverworldScene');
    });
  }
}
