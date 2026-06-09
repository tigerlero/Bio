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
  { name: 'Home', x: 600, y: 600, w: 400, h: 400, color: 0xffffff },
  { name: 'Projects', x: 200, y: 100, w: 600, h: 500, color: 0x4488ff },
  { name: 'Jobs', x: 1000, y: 200, w: 600, h: 500, color: 0x44cc44 },
  { name: 'Skills', x: 1000, y: 800, w: 600, h: 500, color: 0xcc44ff },
  { name: 'Education', x: 100, y: 800, w: 600, h: 500, color: 0xffaa44 },
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
    this.bio = loadBio();
    const { width, height } = this.scale;

    // World bounds (larger than screen)
    this.physics.world.setBounds(0, 0, 1800, 1400);

    // Draw ground
    const ground = this.add.graphics();
    ground.fillStyle(0x2d5a27);
    ground.fillRect(0, 0, 1800, 1400);

    // Draw zone areas with grass patterns
    for (const zone of ZONES) {
      ground.fillStyle(zone.color, 0.15);
      ground.fillRect(zone.x, zone.y, zone.w, zone.h);
      ground.lineStyle(2, zone.color, 0.4);
      ground.strokeRect(zone.x, zone.y, zone.w, zone.h);
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
    this.minimap = new Minimap(this, ZONES, 1800, 1400);

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
    this.cameras.main.setBounds(0, 0, 1800, 1400);
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

    this.player.update();

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
    // Trees
    const treePositions = [
      [50, 50], [80, 120], [150, 300], [200, 500],
      [700, 50], [750, 80], [1100, 50], [1150, 80],
      [50, 1100], [120, 1150], [50, 1300], [150, 1350],
      [1700, 50], [1750, 120], [1700, 1300], [1750, 1350],
      [1600, 600], [1650, 800], [900, 50], [950, 50],
      [50, 700], [100, 750], [1700, 700], [1750, 750],
      [900, 1350], [950, 1350],
    ];
    for (const [tx, ty] of treePositions) {
      const tree = this.add.image(tx, ty, 'tree').setDepth(2);
      this.tweens.add({
        targets: tree,
        x: tx + 2,
        duration: 2000 + Math.random() * 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }

    // Rocks
    const rockPositions = [
      [300, 150], [550, 500], [200, 400], [600, 200],
      [1300, 300], [1500, 1000], [300, 1200], [1400, 1300],
    ];
    for (const [rx, ry] of rockPositions) {
      this.add.image(rx, ry, 'rock').setDepth(2);
    }

    // Flowers
    const flowerPositions = [
      [150, 200], [250, 100], [450, 200], [350, 500],
      [650, 300], [700, 450], [150, 550], [300, 620],
      [1200, 200], [1300, 350], [1500, 500], [1400, 700],
      [1100, 900], [1200, 1100], [1300, 1300], [300, 900],
      [500, 1100], [700, 1300], [900, 1100], [1700, 800],
    ];
    for (const [fx, fy] of flowerPositions) {
      const flower = this.add.image(fx, fy, 'flower').setDepth(1);
      this.tweens.add({
        targets: flower,
        x: fx + 1.5,
        duration: 1200 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 1000,
      });
    }

    // Paths (simple lines)
    deco.lineStyle(12, 0x8b7355, 0.3);
    deco.beginPath();
    deco.moveTo(600, 800);
    deco.lineTo(500, 350);
    deco.strokePath();

    deco.beginPath();
    deco.moveTo(600, 800);
    deco.lineTo(1300, 450);
    deco.strokePath();

    deco.beginPath();
    deco.moveTo(600, 800);
    deco.lineTo(1300, 1050);
    deco.strokePath();

    deco.beginPath();
    deco.moveTo(600, 800);
    deco.lineTo(400, 1050);
    deco.strokePath();
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

    // Skill gems (one per category, placed at fixed positions)
    const skillPositions = [
      { x: 1080, y: 860 }, { x: 1200, y: 900 },
      { x: 1320, y: 860 }, { x: 1240, y: 1000 },
      { x: 1120, y: 1000 }, { x: 1400, y: 960 },
      { x: 1160, y: 1080 },
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
