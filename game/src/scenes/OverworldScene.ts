import Phaser from 'phaser';
import { Player, PlayerState } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { ModalPanel } from '../ui/ModalPanel';
import { Minimap } from '../ui/Minimap';
import { SaveSystem } from '../systems/SaveSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { AudioManager } from '../systems/AudioManager';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InteractionButton } from '../ui/InteractionButton';
import { PauseMenu } from '../ui/PauseMenu';
import { SettingsManager } from '../systems/SettingsManager';
import { loadBio, getBio } from '../data/bioLoader';
import type { BioData, Project, Job, Education } from '../data/bio';

interface ZoneRect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

const ZONES: ZoneRect[] = [
  { name: 'Home', x: 1050, y: 750, w: 500, h: 400, color: 0xffffff },
  { name: 'Projects', x: 100, y: 100, w: 700, h: 550, color: 0x4488ff },
  { name: 'Jobs', x: 1800, y: 100, w: 700, h: 550, color: 0x44cc44 },
  { name: 'Education', x: 100, y: 1350, w: 700, h: 550, color: 0xffaa44 },
  { name: 'Skills', x: 1800, y: 1350, w: 700, h: 550, color: 0xcc44ff },
];

interface CoffeeShopData { name: string; x: number; y: number; tagline: string; }
const COFFEE_SHOPS: CoffeeShopData[] = [
  { name: 'Central Perk ☕', x: 950, y: 700, tagline: 'Where everybody knows your code!' },
  { name: 'Code Brew ☕', x: 1750, y: 700, tagline: 'Brewing the perfect espresso!' },
  { name: 'Study Bean ☕', x: 950, y: 1250, tagline: 'Fuel for your algorithms!' },
];

export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private modal!: ModalPanel;
  private zoneLabel!: Phaser.GameObjects.Text;
  private currentZone: string = '';
  private bio!: BioData;
  private interactPrompt!: Phaser.GameObjects.Text;
  private minimap!: Minimap;
  private dialogue!: DialogueSystem;
  private keyM!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private nightOverlay!: Phaser.GameObjects.Graphics;
  private nightTimer = 0;
  private joystick!: VirtualJoystick;
  private interactBtn!: InteractionButton;
  private pauseMenu!: PauseMenu;
  private isMobile = false;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  create(): void {
    this.npcs = [];
    this.bio = loadBio();
    const { width, height } = this.scale;

    // World bounds (larger than screen)
    this.physics.world.setBounds(0, 0, 2600, 2000);

    // Draw ground
    const ground = this.add.graphics();
    ground.fillStyle(0x2d5a27);
    ground.fillRect(0, 0, 2600, 2000);

    // Draw street network (wide paths between zones)
    const streetColor = 0x7a6a4a;
    const streetAlpha = 0.45;
    const streetW = 24;
    ground.fillStyle(streetColor, streetAlpha);

    // Main horizontal street (above Home)
    ground.fillRect(0, 688, 2600, 48);
    // Left vertical street (between Projects/Education and Home)
    ground.fillRect(838, 0, 48, 2000);
    // Right vertical street (between Jobs/Skills and Home)
    ground.fillRect(1714, 0, 48, 2000);
    // Bottom horizontal street (below Home)
    ground.fillRect(0, 1312, 2600, 48);

    // Street markings (center dashes)
    ground.fillStyle(0xddd4b0, 0.2);
    for (let x = 0; x < 2600; x += 60) {
      ground.fillRect(x + 14, 704, 8, 2);
    }
    for (let x = 0; x < 2600; x += 60) {
      ground.fillRect(x + 14, 1328, 8, 2);
    }
    for (let y = 0; y < 2000; y += 60) {
      ground.fillRect(854, y + 14, 2, 8);
    }
    for (let y = 0; y < 2000; y += 60) {
      ground.fillRect(1730, y + 14, 2, 8);
    }

    // Draw zone areas
    for (const zone of ZONES) {
      ground.fillStyle(zone.color, 0.15);
      ground.fillRect(zone.x, zone.y, zone.w, zone.h);
      ground.lineStyle(2, zone.color, 0.4);
      ground.strokeRect(zone.x, zone.y, zone.w, zone.h);
    }

    // Coffee shop zones (small colored squares with awning)
    const coffeeColors = [0x6f4e37, 0x8b5e3c, 0xa0522d];
    for (let i = 0; i < COFFEE_SHOPS.length; i++) {
      const cs = COFFEE_SHOPS[i];
      ground.fillStyle(coffeeColors[i], 0.3);
      ground.fillRect(cs.x - 24, cs.y - 24, 48, 48);
      ground.lineStyle(2, coffeeColors[i], 0.5);
      ground.strokeRect(cs.x - 24, cs.y - 24, 48, 48);
    }

    // Decorative elements
    this.addDecorations();

    // Zone labels
    for (const zone of ZONES) {
      const label = this.add.text(
        zone.x + zone.w / 2,
        zone.y + 20,
        zone.name,
        { fontSize: '14px', color: '#ffffffaa' },
      );
      label.setOrigin(0.5);
      label.setDepth(1);
    }

    // Zone entrance label (center screen, appears on zone enter)
    this.zoneLabel = this.add.text(width / 2, height / 3, '', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    // Player (load saved position)
    const savedX = SaveSystem.load('player_x', 900);
    const savedY = SaveSystem.load('player_y', 700);
    this.player = new Player(this, savedX, savedY);

    // NPCs
    this.spawnNPCs();
    this.updateNPCBadges();

    // Modal
    this.modal = new ModalPanel(this);

    // Dialogue
    this.dialogue = new DialogueSystem(this);

    // Interact prompt
    this.interactPrompt = this.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(80).setVisible(false);

    // Day/night overlay
    this.nightOverlay = this.add.graphics();
    this.nightOverlay.setDepth(50);
    this.nightOverlay.setScrollFactor(0);

    // Minimap
    this.minimap = new Minimap(this, ZONES, 2600, 2000);

    // Key bindings
    this.keyM = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Mobile controls
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.joystick = new VirtualJoystick(this);
    this.interactBtn = new InteractionButton(this);
    if (this.isMobile) {
      this.joystick.show();
      this.interactBtn.show();
    }

    // Pause menu
    this.pauseMenu = new PauseMenu(this);

    // Camera
    this.cameras.main.setBounds(0, 0, 2600, 2000);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBackgroundColor('#1a2a1a');
  }

  update(_time: number, delta: number): void {
    // Pause menu toggle (ESC)
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      if (this.modal.getIsOpen()) {
        this.modal.close();
      } else if (this.dialogue.getIsActive()) {
        this.dialogue.skipAll();
      } else {
        this.pauseMenu.getIsOpen() ? this.pauseMenu.close() : this.pauseMenu.open();
      }
    }

    this.player.state = this.pauseMenu.getIsOpen()
      ? PlayerState.IN_MENU
      : this.player.state;

    // Mobile input
    this.player.joystickDx = this.joystick.dx;
    this.player.joystickDy = this.joystick.dy;
    this.player.joystickActive = this.joystick.isActive();
    this.interactBtn.update();
    if (this.interactBtn.justPressed) {
      this.player.interactionPressed = true;
    }

    this.player.update(delta);

    this.pauseMenu.update();

    for (const npc of this.npcs) {
      npc.update();
      npc.updateLabel();
      const badge = npc.getData('badge') as Phaser.GameObjects.Text | undefined;
      if (badge) badge.setPosition(npc.x + 12, npc.y - 32);
    }

    this.dialogue.update(delta);
    this.minimap.update(this.player.x, this.player.y);

    if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
      this.minimap.toggle();
    }

    // Day/night cycle
    this.nightTimer += delta / 1000;
    const nightPhase = (Math.sin(this.nightTimer * 0.05) + 1) / 2;
    const alpha = nightPhase * 0.4;
    const { width, height } = this.scale;
    this.nightOverlay.clear();
    this.nightOverlay.fillStyle(0x000022, alpha);
    this.nightOverlay.fillRect(0, 0, width, height);

    this.checkZone();
    this.checkInteraction();
  }

  private addDecorations(): void {
    const deco = this.add.graphics();
    // Trees around the expanded world
    const treePositions = [
      [50,50],[80,120],[150,300],[200,500],[450,50],[500,80],[550,50],
      [850,80],[850,120],[900,50],[1100,50],[1150,80],[1200,50],
      [1400,100],[1450,300],[1500,500],[1550,200],[1600,100],
      [1800,50],[1850,80],[1900,50],[1950,120],[2000,50],
      [2150,80],[2200,50],[2300,120],[2400,50],[2500,80],
      [50,650],[100,680],[150,620],[200,660],[250,640],
      [2350,650],[2400,680],[2450,620],[2500,660],
      [50,1380],[100,1420],[150,1360],[200,1400],
      [2350,1380],[2400,1420],[2450,1360],[2500,1400],
      [50,1800],[80,1850],[150,1900],[200,1950],[450,1920],
      [850,1850],[900,1900],[1100,1950],[1150,1880],
      [1400,1920],[1450,1900],[1500,1850],[1550,1950],
      [1800,1800],[1850,1880],[1900,1920],[1950,1900],
      [2150,1950],[2200,1880],[2300,1850],[2400,1900],[2500,1920],
      [1100,1200],[1150,1250],[1200,1180],[1250,1220],
      [1100,1350],[1150,1380],[1200,1330],[1250,1370],
    ];
    for (const [tx, ty] of treePositions) {
      const t = this.add.image(tx, ty, 'tree').setDepth(2);
      this.tweens.add({
        targets: t, x: tx + 2, duration: 2000 + Math.random() * 1500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 2000,
      });
    }

    // Rocks
    const rockPositions = [
      [300,150],[550,500],[200,400],[600,200],[1300,300],
      [400,1200],[600,1400],[200,1100],[1400,400],[1600,600],
      [2400,300],[2500,500],[2350,1000],[2450,1200],
      [100,1650],[300,1750],[500,1850],[2300,1700],[2450,1800],
    ];
    for (const [rx, ry] of rockPositions) {
      this.add.image(rx, ry, 'rock').setDepth(2);
    }

    // Flowers
    const flowerPositions = [
      [200,200],[350,300],[450,150],[550,250],[650,350],[750,200],
      [200,900],[300,850],[400,950],[500,900],[200,1000],
      [1850,200],[1950,300],[2050,150],[2150,250],[2250,350],[2350,200],
      [1850,900],[1950,850],[2050,950],[2150,900],
      [200,1550],[300,1650],[450,1750],[550,1600],[650,1800],[750,1700],
      [1850,1550],[1950,1650],[2050,1750],[2150,1600],[2250,1800],[2350,1700],
      [1100,600],[1150,650],[1200,550],[1250,600],
      [1100,1400],[1150,1450],[1200,1350],[1250,1400],
      [1500,700],[1550,750],[1600,700],[1650,750],
      [1500,1250],[1550,1300],[1600,1250],[1650,1300],
    ];
    for (const [fx, fy] of flowerPositions) {
      const f = this.add.image(fx, fy, 'flower').setDepth(1);
      this.tweens.add({
        targets: f, x: fx + 1.5, duration: 1200 + Math.random() * 800,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 1000,
      });
    }

    // Sidewalk edges along streets
    deco.lineStyle(2, 0x998866, 0.3);
    // Main horizontal edges
    deco.beginPath(); deco.moveTo(0, 688); deco.lineTo(838, 688); deco.strokePath();
    deco.beginPath(); deco.moveTo(1762, 688); deco.lineTo(2600, 688); deco.strokePath();
    deco.beginPath(); deco.moveTo(0, 736); deco.lineTo(838, 736); deco.strokePath();
    deco.beginPath(); deco.moveTo(1762, 736); deco.lineTo(2600, 736); deco.strokePath();
    // Vertical left edges
    deco.beginPath(); deco.moveTo(838, 0); deco.lineTo(838, 688); deco.strokePath();
    deco.beginPath(); deco.moveTo(838, 736); deco.lineTo(838, 1312); deco.strokePath();
    deco.beginPath(); deco.moveTo(838, 1360); deco.lineTo(838, 2000); deco.strokePath();
    deco.beginPath(); deco.moveTo(886, 0); deco.lineTo(886, 688); deco.strokePath();
    deco.beginPath(); deco.moveTo(886, 736); deco.lineTo(886, 1312); deco.strokePath();
    deco.beginPath(); deco.moveTo(886, 1360); deco.lineTo(886, 2000); deco.strokePath();
    // Vertical right edges
    deco.beginPath(); deco.moveTo(1714, 0); deco.lineTo(1714, 688); deco.strokePath();
    deco.beginPath(); deco.moveTo(1714, 736); deco.lineTo(1714, 1312); deco.strokePath();
    deco.beginPath(); deco.moveTo(1714, 1360); deco.lineTo(1714, 2000); deco.strokePath();
    deco.beginPath(); deco.moveTo(1762, 0); deco.lineTo(1762, 688); deco.strokePath();
    deco.beginPath(); deco.moveTo(1762, 736); deco.lineTo(1762, 1312); deco.strokePath();
    deco.beginPath(); deco.moveTo(1762, 1360); deco.lineTo(1762, 2000); deco.strokePath();
    // Bottom horizontal edges
    deco.beginPath(); deco.moveTo(0, 1312); deco.lineTo(838, 1312); deco.strokePath();
    deco.beginPath(); deco.moveTo(1762, 1312); deco.lineTo(2600, 1312); deco.strokePath();
    deco.beginPath(); deco.moveTo(0, 1360); deco.lineTo(838, 1360); deco.strokePath();
    deco.beginPath(); deco.moveTo(1762, 1360); deco.lineTo(2600, 1360); deco.strokePath();

    // Coffee shop name labels
    const fsLabel = this.add.graphics().setDepth(5);
    for (const cs of COFFEE_SHOPS) {
      const nameLabel = this.add.text(cs.x, cs.y - 40, cs.name, {
        fontSize: '11px', color: '#eebb88', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({
        targets: nameLabel, y: cs.y - 44, duration: 1500, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Coffee cup icon
      const cup = this.add.text(cs.x, cs.y, '☕', {
        fontSize: '20px',
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({
        targets: cup, y: cs.y + 2, scale: { from: 1, to: 1.15 },
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      // Small awning graphic
      fsLabel.fillStyle(0x6f4e37, 0.5);
      fsLabel.fillRect(cs.x - 30, cs.y - 28, 60, 6);
      fsLabel.fillStyle(0xd4a574, 0.4);
      for (let sx = cs.x - 28; sx < cs.x + 28; sx += 8) {
        fsLabel.fillTriangle(sx, cs.y - 28, sx + 4, cs.y - 28, sx + 2, cs.y - 22);
      }
    }
  }

  private spawnNPCs(): void {
    this.bio = getBio();

    // Project NPCs (first 3 walk)
    for (let i = 0; i < this.bio.projects.length; i++) {
      const p = this.bio.projects[i];
      const walk = i < 3 ? 30 : 0;
      this.spawnNPC(p.position.x, p.position.y, 'npc', p.title, 'project', p, walk);
    }

    // Job buildings (first 2 walk) with company logos
    const jobLogoMap: Record<string, string> = {
      'Valmore-Neogen': 'logo_valmore',
      'ExpressTransfers': 'logo_expresstransfers',
      'Evalion-SHL': 'logo_evalion',
      'Newdeal Real Estates': 'logo_newdeal',
      'Datawise': 'logo_datawise',
    };
    for (let i = 0; i < this.bio.jobs.length; i++) {
      const j = this.bio.jobs[i];
      const walk = i < 2 ? 25 : 0;
      const logoKey = jobLogoMap[j.company] || undefined;
      this.spawnNPC(j.position.x, j.position.y, 'building', j.company, 'job', j, walk, logoKey);
    }

    // Education books
    for (const edu of this.bio.education) {
      this.spawnNPC(edu.position.x, edu.position.y, 'book', edu.degree, 'education', edu);
    }

    // Skill gems (one per category, placed in Skills zone)
    const skillPositions = [
      { x: 1900, y: 1450 }, { x: 2050, y: 1480 },
      { x: 2200, y: 1450 }, { x: 2100, y: 1580 },
      { x: 1950, y: 1600 }, { x: 2300, y: 1500 },
      { x: 2020, y: 1700 },
    ];
    let si = 0;
    for (const category of Object.keys(this.bio.skills)) {
      if (si >= skillPositions.length) break;
      const pos = skillPositions[si];
      const fakeEdu: Education = {
        id: `skill_${category.toLowerCase()}`,
        degree: category,
        school: `${Object.entries(this.bio.skills)[si][1].length} skills`,
        year: 0,
        description: `Skills in ${category}: ${Object.entries(this.bio.skills)[si][1].join(', ')}`,
        position: { x: pos.x, y: pos.y },
      };
      this.spawnNPC(pos.x, pos.y, 'gem', category, 'skill', fakeEdu);
      si++;
    }

    // Coffee shops
    for (const cs of COFFEE_SHOPS) {
      const fakeEdu: Education = {
        id: `coffee_${cs.name.replace(/[^a-z]/gi, '_').toLowerCase()}`,
        degree: '☕ Freddo Espresso',
        school: cs.name,
        year: 2024,
        description: cs.tagline,
        position: { x: cs.x, y: cs.y },
      };
      this.spawnNPC(cs.x, cs.y, 'building', cs.name, 'coffee', fakeEdu, 0);
    }
  }

  private spawnNPC(
    x: number, y: number,
    texture: string,
    name: string,
    type: string,
    data: Project | Job | Education,
    walkRange = 0,
    logoKey?: string,
  ): void {
    const npc = new NPC(this, x, y, texture, name, `${type}_${data.id}`, walkRange, logoKey);
    npc.setData('type', type);
    npc.setData('data', data);
    this.npcs.push(npc);
  }

  private checkZone(): void {
    const px = this.player.x;
    const py = this.player.y;

    for (const zone of ZONES) {
      if (
        px >= zone.x && px <= zone.x + zone.w &&
        py >= zone.y && py <= zone.y + zone.h
      ) {
        if (this.currentZone !== zone.name) {
          this.currentZone = zone.name;
          this.showZoneLabel(zone.name);
          // Camera tint
    AudioManager.get().playSfx('zoneEnter');
          this.cameras.main.fadeIn(300, 0, 0, 0);
        }
        return;
      }
    }
    this.currentZone = '';
  }

  private showZoneLabel(name: string): void {
    this.zoneLabel.setText(`✦ ${name} ✦`);
    this.zoneLabel.setAlpha(1);
    this.tweens.add({
      targets: this.zoneLabel,
      alpha: 0,
      delay: 1500,
      duration: 500,
    });
  }

  private checkInteraction(): void {
    const sceneZones = ['Skills', 'Projects', 'Jobs', 'Education'];
    const sceneMap: Record<string, string> = {
      Skills: 'SkillGardenScene',
      Projects: 'ProjectParkScene',
      Jobs: 'JobDistrictScene',
      Education: 'EducationCampusScene',
    };

    if (this.player.isInteractPressed() && !this.modal.getIsOpen() && !this.dialogue.getIsActive()) {
      let closest: NPC | null = null;
      let minDist = 40;

      for (const npc of this.npcs) {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          npc.x, npc.y,
        );
        if (dist < minDist) {
          minDist = dist;
          closest = npc;
        }
      }

      if (closest) {
        this.interactWithNPC(closest);
        return;
      }

      if (sceneMap[this.currentZone]) {
        if (this.currentZone === 'Skills') {
          this.enterSkillTree();
        } else {
          this.enterZoneScene(sceneMap[this.currentZone]);
        }
        return;
      }
    }

    // Show/hide prompt
    let nearNPC = false;
    let promptTarget: NPC | null = null;
    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.x, npc.y,
      );
      if (dist < 40 && !this.modal.getIsOpen() && !this.dialogue.getIsActive()) {
        nearNPC = true;
        promptTarget = npc;
        break;
      }
    }

    const pk = this.isMobile ? 'E' : 'E';
    if (sceneZones.includes(this.currentZone) && !nearNPC) {
      const label = this.currentZone === 'Skills' ? 'view full Skill Tree' : 'explore';
      this.interactPrompt.setText(`Press ${pk} to ${label}`);
      this.interactPrompt.setPosition(this.player.x, this.player.y - 40);
      this.interactPrompt.setVisible(true);
    } else if (promptTarget) {
      this.interactPrompt.setText(`Press ${pk} to interact`);
      this.interactPrompt.setPosition(promptTarget.x, promptTarget.y - 40);
      this.interactPrompt.setVisible(true);
    } else {
      this.interactPrompt.setVisible(false);
    }
  }

  private enterSkillTree(): void {
    SaveSystem.save('player_x', this.player.x);
    SaveSystem.save('player_y', this.player.y);
    this.circularReveal(() => {
      this.scene.start('SkillGardenScene');
    });
  }

  private enterZoneScene(key: string): void {
    SaveSystem.save('player_x', this.player.x);
    SaveSystem.save('player_y', this.player.y);
    this.circularReveal(() => {
      this.scene.start(key);
    });
  }

  private circularReveal(onMidpoint: () => void): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();
    gfx.setDepth(300);
    gfx.setScrollFactor(0);
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy) + 50;

    gfx.fillStyle(0x000000, 1);
    const grow = this.tweens.addCounter({
      from: 0,
      to: maxR,
      duration: 350,
      ease: 'Power2',
      onUpdate: (tween) => {
        const val = tween.getValue() || 0;
        gfx.clear();
        gfx.fillRect(0, 0, width, height);
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(cx, cy, val);
      },
      onComplete: () => {
        onMidpoint();
        this.time.delayedCall(100, () => {
          this.tweens.addCounter({
            from: maxR,
            to: 0,
            duration: 350,
            ease: 'Power2',
            onUpdate: (tw) => {
              const sv = tw.getValue() || 0;
              gfx.clear();
              gfx.fillStyle(0x000000, 1);
              gfx.fillRect(0, 0, width, height);
              gfx.fillStyle(0x000000, 1);
              gfx.fillCircle(cx, cy, sv);
            },
            onComplete: () => gfx.destroy(),
          });
        });
      },
    });
  }

  private interactWithNPC(npc: NPC): void {
    AudioManager.get().playSfx('interact');
    const type = npc.getData('type') as string;
    const data = npc.getData('data') as Project | Job | Education;
    const name = npc.npcName;

    // Mark as visited
    const visited: string[] = SaveSystem.load('visited_npcs', []);
    if (!visited.includes(npc.dataId)) {
      visited.push(npc.dataId);
      SaveSystem.save('visited_npcs', visited);
      this.updateNPCBadges();
    }

    // Build detail html
    let html = '';
    if (type === 'project') {
      const p = data as Project;
      html = `# ${p.title}\n${p.description}\n\nTech: ${p.tech.join(', ')}\n\nLink: ${p.link}`;
    } else if (type === 'job') {
      const j = data as Job;
      html = `# ${j.company}\n${j.role} | ${j.period}\n\n${j.highlights.map((h) => `• ${h}`).join('\n')}`;
    } else if (type === 'education') {
      const e = data as Education;
      html = `# ${e.degree}\n${e.school} — ${e.year}\n\n${e.description || ''}`;
    }

    if (type === 'skill') {
      this.emitSparkles(npc.x, npc.y);
    }

    if (type === 'coffee') {
      this.dialogue.show([
        `☕ Welcome to ${name}!`,
        'Fresh freddo espresso — €2.50',
        'Press E to buy ☕',
      ], name, undefined, () => {
        this.dialogue.show([
          '☕ Enjoy your freddo espresso!',
          'You feel energized and ready to code!',
          '+50% speed boost for 10 seconds!',
        ], name, undefined, () => {
          this.player.coffeeBoostTimer = 10;
          // Visual coffee cup above player
          const cupIcon = this.add.text(0, 0, '☕', {
            fontSize: '18px',
          }).setOrigin(0.5).setDepth(30);
          cupIcon.setPosition(this.player.x, this.player.y - 40);
          this.tweens.add({
            targets: cupIcon,
            props: { alpha: { value: 0 }, y: { value: this.player.y - 80 } },
            onUpdate: () => {
              cupIcon.setPosition(this.player.x, cupIcon.y);
            },
            onComplete: () => cupIcon.destroy(),
          });
        });
      });
      return;
    }

    const greeting = `Hello! Let me tell you about this ${type}...`;
    const lines = [greeting];

    this.dialogue.show(lines, name, undefined, () => {
      this.modal.show(html);
    });
  }

  private emitSparkles(x: number, y: number): void {
    const colors = [0xcc44ff, 0xff44ff, 0x8844ff, 0x44ff88, 0x44aaff];
    for (let i = 0; i < 12; i++) {
      const dot = this.add.graphics();
      dot.fillStyle(colors[i % colors.length], 1);
      dot.fillCircle(0, 0, 3);
      dot.setPosition(x, y);
      dot.setDepth(30);
      const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
      const dist = 30 + Math.random() * 40;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private updateNPCBadges(): void {
    const visited: string[] = SaveSystem.load('visited_npcs', []);
    for (const npc of this.npcs) {
      const wasVisited = visited.includes(npc.dataId);
      const existing = npc.getData('badge') as Phaser.GameObjects.Text | undefined;
      if (wasVisited && existing) {
        existing.destroy();
        npc.setData('badge', undefined);
      } else if (!wasVisited && !existing) {
        const badge = this.add.text(npc.x + 12, npc.y - 32, 'NEW', {
          fontSize: '10px',
          color: '#ffdd44',
          backgroundColor: '#000000aa',
          padding: { x: 2, y: 1 },
        });
        badge.setOrigin(0.5);
        badge.setDepth(25);
        npc.setData('badge', badge);
      }
    }
  }
}
