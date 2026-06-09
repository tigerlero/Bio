import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const PHASES: { name: string; label: string }[] = [
  { name: 'briefing', label: 'BRIEFING' },
  { name: 'camera', label: 'CAMERA ROOM' },
  { name: 'patrol', label: 'FIELD PATROL' },
  { name: 'recon', label: 'RECON OBSERVATION' },
  { name: 'basketball', label: 'OFF-DUTY: BASKETBALL' },
  { name: 'debrief', label: 'DEBRIEF' },
];

export class BaseOpsScene extends Phaser.Scene {
  private phaseIndex = 0;
  private score = 0;
  private morale = 100;
  private fatigue = 0;
  private cycleCount = 0;
  private phaseComplete = false;
  private gameOver = false;

  // Persistent text objects
  private statusText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private moraleText!: Phaser.GameObjects.Text;
  private fatigueText!: Phaser.GameObjects.Text;
  private phaseLabel!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private briefingText!: Phaser.GameObjects.Text;

  // Camera Room
  private camCells: { x: number; y: number; gfx: Phaser.GameObjects.Graphics }[] = [];
  private timerBar!: Phaser.GameObjects.Graphics;
  private anomalyIndex = -1;
  private anomalyTimer = 0;
  private nextAnomalyAt = 0;
  private camActive = false;
  private camRound = 0;
  private camScore = 0;

  // Patrol
  private px = 0; private py = 0;
  private patrolGfx!: Phaser.GameObjects.Graphics;
  private patrolKeys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private enemies: { x: number; y: number; dir: number; coneAngle: number; facing: number }[] = [];
  private visibility = 0;
  private patrolComplete = false;

  // Recon
  private crosshair!: Phaser.GameObjects.Graphics;
  private reconGfx!: Phaser.GameObjects.Graphics;
  private reconHudText!: Phaser.GameObjects.Text;
  private targets: { x: number; y: number; isTarget: boolean; marked: boolean }[] = [];
  private reconScore = 0;
  private reconTotal = 0;
  private reconActive = false;
  private reconTimer!: Phaser.Time.TimerEvent;

  // Basketball
  private powerBar!: Phaser.GameObjects.Graphics;
  private powerLabel!: Phaser.GameObjects.Text;
  private power = 0;
  private powerDir = 1;
  private shooting = false;
  private shootReady = false;
  private hoopScore = 0;

  // Phase-specific listener cleanup
  private phaseListeners: (() => void)[] = [];

  constructor() {
    super({ key: 'BaseOpsScene' });
  }

  create(): void {
    this.phaseIndex = 0;
    this.score = 0;
    this.morale = 100;
    this.fatigue = 0;
    this.cycleCount = 0;
    this.phaseComplete = false;

    const { width, height } = this.scale;
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#0a0f1a');

    this.add.text(width / 2, 12, '✦ BASE OPS: SURVEILLANCE & FIELD DUTY ✦', {
      fontSize: '14px', color: '#88ccff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.phaseLabel = this.add.text(width / 2, 32, '', {
      fontSize: '11px', color: '#aadd88', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.scoreText = this.add.text(10, 50, '', { fontSize: '11px', color: '#ffdd88', fontFamily: 'monospace' }).setDepth(10);
    this.moraleText = this.add.text(10, 64, '', { fontSize: '11px', color: '#88ddff', fontFamily: 'monospace' }).setDepth(10);
    this.fatigueText = this.add.text(10, 78, '', { fontSize: '11px', color: '#ff8866', fontFamily: 'monospace' }).setDepth(10);

    this.briefingText = this.add.text(width / 2, height / 2 - 20, '', {
      fontSize: '15px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.statusText = this.add.text(width / 2, height / 2 + 30, '', {
      fontSize: '12px', color: '#aaaacc', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.promptText = this.add.text(width / 2, height - 16, '', {
      fontSize: '10px', color: '#6688aa', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(20);

    // Reusable sub-objects
    this.timerBar = this.add.graphics().setDepth(5);
    this.patrolGfx = this.add.graphics().setDepth(1);
    this.reconGfx = this.add.graphics().setDepth(1);
    this.crosshair = this.add.graphics().setDepth(3);
    this.powerBar = this.add.graphics().setDepth(2);
    this.reconHudText = this.add.text(0, 0, '', {
      fontSize: '10px', color: '#88aacc', fontFamily: 'monospace',
    }).setDepth(5);
    this.powerLabel = this.add.text(0, 0, '', {
      fontSize: '9px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(3);

    this.input.keyboard!.on('keydown-ESC', () => this.returnToDistrict());

    this.startPhase();
  }

  update(_time: number, delta: number): void {
    this.scoreText.setText(`Score: ${this.score}`);
    this.moraleText.setText(`Morale: ${this.morale}%`);
    this.fatigueText.setText(`Fatigue: ${this.fatigue}%`);

    // Game over check
    if (!this.gameOver && (this.morale <= 0 || this.fatigue >= 100)) {
      this.gameOver = true;
      this.showGameOver();
      return;
    }

    const phase = PHASES[this.phaseIndex].name;
    if (phase === 'camera') this.updateCamera(delta);
    else if (phase === 'patrol') this.updatePatrol(delta);
    else if (phase === 'recon') this.updateRecon();
    else if (phase === 'basketball') this.updateBasketball(delta);
  }

  private showGameOver(): void {
    this.cleanupPhaseListeners();
    this.clearPhase();
    const reason = this.morale <= 0 ? 'Morale depleted — you gave up.' : 'Fatigue maxed — you collapsed.';
    this.briefingText.setText(
      `═ DISCHARGED ═\n\n${reason}\n\nScore: ${this.score}\nDay: ${this.cycleCount + 1}\n\nClick or press E to return to base`
    );
    this.briefingText.setAlpha(1);
    this.promptText.setText('');
    this.addPhaseListener('pointerdown', () => this.returnToDistrict());
    const keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.addPhaseKey(keyE, () => this.returnToDistrict());
  }

  private startPhase(): void {
    this.cleanupPhaseListeners();
    const phase = PHASES[this.phaseIndex];
    this.phaseLabel.setText(`◆ ${phase.label} ◆`);
    this.phaseComplete = false;
    this.clearPhase();

    if (phase.name === 'briefing') this.startBriefing();
    else if (phase.name === 'camera') this.startCamera();
    else if (phase.name === 'patrol') this.startPatrol();
    else if (phase.name === 'recon') this.startRecon();
    else if (phase.name === 'basketball') this.startBasketball();
    else if (phase.name === 'debrief') this.startDebrief();
  }

  private nextPhase(): void {
    this.phaseIndex++;
    if (this.phaseIndex >= PHASES.length) {
      this.phaseIndex = 0;
      this.cycleCount++;
      if (this.cycleCount >= 2) { this.showFinalSummary(); return; }
    }
    this.startPhase();
  }

  private showFinalSummary(): void {
    this.cleanupPhaseListeners();
    this.clearPhase();
    const totalScore = this.score;
    const grade = totalScore > 400 ? 'A' : totalScore > 300 ? 'B' : totalScore > 200 ? 'C' : totalScore > 100 ? 'D' : 'F';
    const lines = [
      '═ MISSION COMPLETE ═',
      '',
      `Final Score: ${totalScore}`,
      `Grade: ${grade}`,
      `Final Morale: ${this.morale}%`,
      `Final Fatigue: ${this.fatigue}%`,
      '',
      grade === 'A' ? 'Outstanding performance, soldier.' :
      grade === 'B' ? 'Solid work. Room for improvement.' :
      grade === 'C' ? 'Adequate. Push harder next time.' :
      grade === 'D' ? 'Below standard. Report for retraining.' :
      'Discharged. Consider a different career path.',
      '',
      'Click or press E to return to base',
    ];
    this.briefingText.setText(lines.join('\n'));
    this.briefingText.setAlpha(1);
    this.promptText.setText('');
    this.addPhaseListener('pointerdown', () => this.returnToDistrict());
    const keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.addPhaseKey(keyE, () => this.returnToDistrict());
  }

  private cleanupPhaseListeners(): void {
    for (const fn of this.phaseListeners) fn();
    this.phaseListeners = [];
  }

  private addPhaseListener(ev: string, fn: (p: Phaser.Input.Pointer) => void): void {
    this.input.on(ev, fn);
    this.phaseListeners.push(() => this.input.off(ev, fn));
  }

  private addPhaseKey(key: Phaser.Input.Keyboard.Key, cb: () => void): void {
    const handler = () => { if (!this.phaseComplete) { this.phaseComplete = true; cb(); } };
    this.input.keyboard!.on('keydown-' + key.keyCode, handler);
    this.phaseListeners.push(() => this.input.keyboard!.off('keydown-' + key.keyCode, handler));
  }

  private clearPhase(): void {
    this.camCells.forEach(c => c.gfx.destroy());
    this.camCells = [];
    this.targets = [];
    this.enemies = [];
    this.patrolGfx.clear();
    this.timerBar.clear();
    this.reconGfx.clear();
    this.crosshair.clear();
    this.powerBar.clear();
    this.reconHudText.setPosition(0, 0).setText('');
    this.powerLabel.setPosition(0, 0).setText('');
    this.briefingText.setAlpha(0);
    this.statusText.setAlpha(0);
    this.promptText.setText('');
  }

  // ── BRIEFING ──
  private startBriefing(): void {
    this.briefingText.setText(
      '═ BRIEFING ═\n\nDay ' + (this.cycleCount + 1) + ' — Base Ops Rotation\n\nYour duties today:\n→ Monitor CCTV feeds (Camera Room)\n→ Field patrol with stealth protocol\n→ Recon observation (binoculars)\n→ Off-duty: team morale activities\n\nPress E or CLICK to begin'
    );
    this.briefingText.setAlpha(1);
    this.promptText.setText('Press E or click to start duty');

    this.addPhaseListener('pointerdown', () => this.nextPhase());
    const keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.addPhaseKey(keyE, () => this.nextPhase());
  }

  // ── CAMERA ROOM ──
  private startCamera(): void {
    const { width } = this.scale;
    this.camActive = true;
    this.camRound = 0;
    this.camScore = 0;
    this.anomalyTimer = 0;
    this.nextAnomalyAt = 1000 + Math.random() * 2000;

    const cols = 2, rows = 2;
    const cw = 120, ch = 80;
    const ox = (width - cols * cw) / 2;
    const oy = 100;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gfx = this.add.graphics().setDepth(1);
        const cx = ox + c * cw;
        const cy = oy + r * ch;
        gfx.fillStyle(0x112233, 1);
        gfx.fillRect(cx, cy, cw, ch);
        gfx.lineStyle(2, 0x335577, 0.8);
        gfx.strokeRect(cx, cy, cw, ch);
        this.add.text(cx + 4, cy + 4, `CAM-${r * 2 + c + 1}`, {
          fontSize: '8px', color: '#4488aa', fontFamily: 'monospace',
        }).setDepth(2);
        this.camCells.push({ x: cx, y: cy, gfx });
      }
    }

    this.statusText.setText('Watch for anomalies — click the odd feed');
    this.statusText.setAlpha(1);

    this.addPhaseListener('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.camActive) return;
      for (let i = 0; i < this.camCells.length; i++) {
        const c = this.camCells[i];
        if (p.x >= c.x && p.x <= c.x + 120 && p.y >= c.y && p.y <= c.y + 80) {
          if (i === this.anomalyIndex) {
            this.camScore += 10;
            this.showFeedback('✓ ANOMALY REPORTED', '#44ff88');
            AudioManager.get().playSfx('interact');
          } else {
            this.camScore = Math.max(0, this.camScore - 5);
            this.morale = Math.max(0, this.morale - 2);
            this.showFeedback('✗ FALSE ALARM', '#ff6644');
          }
          this.anomalyIndex = -1;
          this.camRound++;
          this.anomalyTimer = 0;
          this.nextAnomalyAt = 2000 + Math.random() * 2500;
          if (this.camRound >= 8) this.endCamera();
          break;
        }
      }
    });
  }

  private updateCamera(delta: number): void {
    if (!this.camActive) return;
    const { width } = this.scale;
    this.anomalyTimer += delta;

    // Draw static on all feeds
    for (let i = 0; i < this.camCells.length; i++) {
      const c = this.camCells[i];
      const gfx = c.gfx;
      gfx.clear();
      const isAnomaly = i === this.anomalyIndex;
      gfx.fillStyle(isAnomaly ? 0x331111 : 0x112233, 1);
      gfx.fillRect(c.x, c.y, 120, 80);
      for (let s = 0; s < 30; s++) {
        const sx = c.x + Math.random() * 120;
        const sy = c.y + Math.random() * 80;
        gfx.fillStyle(0xffffff, Math.random() * 0.15);
        gfx.fillRect(sx, sy, 1, 1);
      }
      if (isAnomaly) {
        gfx.lineStyle(2, 0xff2222, 0.9);
        gfx.strokeRect(c.x + 2, c.y + 2, 116, 76);
        gfx.fillStyle(0xff4444, 0.3);
        gfx.fillCircle(c.x + 60, c.y + 40, 15);
        gfx.fillStyle(0xff6666, 0.5);
        gfx.fillRect(c.x + 52, c.y + 48, 16, 20);
      } else {
        gfx.lineStyle(1, 0x335577, 0.6);
        gfx.strokeRect(c.x, c.y, 120, 80);
      }
    }

    // Timer bar (reusable graphics)
    const elapsed = this.anomalyTimer;
    const barW = 200;
    const barX = (width - barW) / 2;
    const barY = 54;
    this.timerBar.clear();
    this.timerBar.fillStyle(0x222244, 0.8);
    this.timerBar.fillRect(barX, barY, barW, 6);

    if (this.anomalyIndex >= 0) {
      const remain = Math.max(0, 1 - elapsed / this.nextAnomalyAt);
      this.timerBar.fillStyle(remain > 0.3 ? 0xffaa44 : 0xff4444, 1);
      this.timerBar.fillRect(barX, barY, barW * remain, 6);

      if (elapsed >= this.nextAnomalyAt) {
        this.morale = Math.max(0, this.morale - 5);
        this.fatigue = Math.min(100, this.fatigue + 5);
        this.showFeedback('✗ MISSED ANOMALY', '#ff6644');
        this.anomalyIndex = -1;
        this.camRound++;
        this.anomalyTimer = 0;
        this.nextAnomalyAt = 2000 + Math.random() * 2500;
        if (this.camRound >= 8) this.endCamera();
      }
    } else {
      this.timerBar.fillStyle(0x44aaff, 0.6);
      this.timerBar.fillRect(barX, barY, barW * Math.min(1, elapsed / this.nextAnomalyAt), 6);

      if (elapsed >= this.nextAnomalyAt) {
        this.anomalyIndex = Math.floor(Math.random() * 4);
        this.anomalyTimer = 0;
        this.nextAnomalyAt = 2000 + Math.random() * 2500;
      }
    }
  }

  private endCamera(): void {
    if (!this.camActive) return;
    this.camActive = false;
    this.score += this.camScore;
    this.showFeedback(`CAMERA ROOM COMPLETE\n+${this.camScore} pts`, '#88ffaa');
    this.time.delayedCall(1500, () => this.nextPhase());
  }

  private showFeedback(msg: string, color: string): void {
    const fb = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, msg, {
      fontSize: '13px', color, fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: fb, alpha: 0, y: fb.y - 30, duration: 1200,
      onComplete: () => fb.destroy(),
    });
  }

  // ── PATROL (STEALTH) ──
  private startPatrol(): void {
    const { width, height } = this.scale;
    this.px = 60;
    this.py = height - 80;
    this.visibility = 0;
    this.patrolComplete = false;
    this.patrolGfx.clear();

    const terrain = this.add.graphics().setDepth(0);
    terrain.fillStyle(0x1a2a1a, 1);
    terrain.fillRect(0, 60, width, height - 60);
    const covers = [
      { x: 100, y: height - 220, w: 60, h: 40 },
      { x: 300, y: height - 280, w: 50, h: 60 },
      { x: 430, y: height - 160, w: 70, h: 35 },
      { x: 220, y: height - 120, w: 40, h: 30 },
      { x: 380, y: height - 220, w: 60, h: 45 },
    ];
    for (const cv of covers) {
      terrain.fillStyle(0x0d1a0d, 0.6);
      terrain.fillRect(cv.x, cv.y, cv.w, cv.h);
      terrain.lineStyle(1, 0x224422, 0.3);
      terrain.strokeRect(cv.x, cv.y, cv.w, cv.h);
    }
    terrain.fillStyle(0x224433, 0.5);
    terrain.fillRect(width - 80, height - 120, 50, 50);
    terrain.lineStyle(2, 0x44ff88, 0.6);
    terrain.strokeRect(width - 80, height - 120, 50, 50);
    this.add.text(width - 55, height - 105, 'EXTRACT', {
      fontSize: '8px', color: '#44ff88', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(1);

    this.enemies = [
      { x: 180, y: height - 180, dir: 1, coneAngle: 0.7, facing: Math.PI / 4 },
      { x: 350, y: height - 150, dir: -1, coneAngle: 0.6, facing: 3 * Math.PI / 4 },
      { x: 250, y: height - 250, dir: 1, coneAngle: 0.5, facing: 0 },
      { x: 450, y: height - 200, dir: -1, coneAngle: 0.7, facing: Math.PI / 2 },
    ];

    this.statusText.setText('Reach extraction — avoid enemy vision cones');
    this.statusText.setAlpha(1);
    this.promptText.setText('WASD / Arrows to move');

    const kb = this.input.keyboard!;
    this.patrolKeys['up'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.patrolKeys['down'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.patrolKeys['left'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.patrolKeys['right'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.patrolKeys['w'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.patrolKeys['a'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.patrolKeys['s'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.patrolKeys['d'] = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  private updatePatrol(delta: number): void {
    if (this.patrolComplete) return;
    const { width, height } = this.scale;
    this.patrolGfx.clear();

    let dx = 0, dy = 0;
    const k = this.patrolKeys;
    if (k['left'].isDown || k['a'].isDown) dx = -0.12 * delta;
    if (k['right'].isDown || k['d'].isDown) dx = 0.12 * delta;
    if (k['up'].isDown || k['w'].isDown) dy = -0.12 * delta;
    if (k['down'].isDown || k['s'].isDown) dy = 0.12 * delta;

    this.px = Phaser.Math.Clamp(this.px + dx, 30, width - 30);
    this.py = Phaser.Math.Clamp(this.py + dy, 70, height - 30);

    for (const e of this.enemies) {
      e.x += e.dir * delta * 0.04;
      if (e.x > width - 50 || e.x < 50) e.dir *= -1;
    }

    // Visibility check + draw vision cones
    let detected = false;
    for (const e of this.enemies) {
      const dist = Phaser.Math.Distance.Between(this.px, this.py, e.x, e.y);
      const facingAngle = e.facing;
      // Draw cone regardless
      this.patrolGfx.fillStyle(0xff4444, 0.06);
      this.patrolGfx.beginPath();
      this.patrolGfx.moveTo(e.x, e.y);
      const coneLen = 130;
      const a1 = facingAngle - e.coneAngle;
      const a2 = facingAngle + e.coneAngle;
      this.patrolGfx.lineTo(e.x + Math.cos(a1) * coneLen, e.y + Math.sin(a1) * coneLen);
      this.patrolGfx.lineTo(e.x + Math.cos(a2) * coneLen, e.y + Math.sin(a2) * coneLen);
      this.patrolGfx.closePath();
      this.patrolGfx.fillPath();

      // Detection check
      if (dist < coneLen) {
        const angle = Math.atan2(this.py - e.y, this.px - e.x);
        const diff = Math.abs(Phaser.Math.Angle.Wrap(angle - facingAngle));
        if (diff < e.coneAngle) {
          detected = true;
        }
      }
    }

    this.visibility += detected ? delta * 0.05 : -delta * 0.03;
    this.visibility = Phaser.Math.Clamp(this.visibility, 0, 100);

    if (this.visibility >= 100) {
      this.fatigue = Math.min(100, this.fatigue + 20);
      this.showFeedback('DETECTED! Fatigue +20', '#ff6644');
      this.visibility = 30;
      this.px = 60;
      this.py = height - 80;
    }

    // Draw player
    this.patrolGfx.fillStyle(0x4488ff, 1);
    this.patrolGfx.fillCircle(this.px, this.py, 8);
    this.patrolGfx.fillStyle(0x66aaff, 0.4);
    this.patrolGfx.fillCircle(this.px, this.py, 12);

    // Draw enemies
    for (const e of this.enemies) {
      this.patrolGfx.fillStyle(0xff4444, 0.9);
      this.patrolGfx.fillCircle(e.x, e.y, 7);
      this.patrolGfx.fillStyle(0xff6666, 0.4);
      this.patrolGfx.fillCircle(e.x, e.y, 10);
    }

    // Visibility meter
    const vx = 10, vy = 100, vw = 12, vh = 80;
    this.patrolGfx.fillStyle(0x222222, 0.8);
    this.patrolGfx.fillRect(vx, vy, vw, vh);
    this.patrolGfx.fillStyle(this.visibility > 50 ? 0xff4444 : 0x44ff44, 0.8);
    this.patrolGfx.fillRect(vx, vy + vh - (vh * this.visibility / 100), vw, vh * this.visibility / 100);

    // VIS label text (draw once)
    const visLabelKey = 'vis_label';
    if (!this.children.getByName(visLabelKey)) {
      this.add.text(vx + 6, vy - 10, 'VIS', {
        fontSize: '7px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(5).setName(visLabelKey);
    }

    if (this.px > width - 90 && this.py > height - 130) {
      this.patrolComplete = true;
      const patrolScore = Math.max(0, Math.floor(100 - this.visibility));
      this.score += patrolScore;
      this.morale = Math.min(100, this.morale + 5);
      this.showFeedback(`EXTRACTED! +${patrolScore} pts`, '#44ff88');
      this.time.delayedCall(1500, () => this.nextPhase());
    }
  }

  // ── RECON ──
  private startRecon(): void {
    const { width, height } = this.scale;
    this.reconScore = 0;
    this.reconTotal = 0;
    this.reconActive = true;
    this.targets = [];
    this.reconGfx.clear();
    this.crosshair.clear();

    const landscape = this.add.graphics().setDepth(0);
    landscape.fillStyle(0x1a2a4a, 1);
    landscape.fillRect(0, 60, width, height - 60);
    landscape.fillStyle(0x2a3a5a, 1);
    landscape.fillRect(0, height / 2 - 30, width, 30);
    landscape.fillStyle(0x1a2a3a, 1);
    landscape.fillRect(0, height / 2, width, height / 2 - 60);
    landscape.fillStyle(0x2a2a3a, 0.8);
    for (let i = 0; i < 5; i++) {
      const mx = i * 100 + 20;
      const mh = 40 + Math.random() * 60;
      landscape.fillTriangle(mx - 40, height / 2 - 30, mx + 40, height / 2 - 30, mx, height / 2 - 30 - mh);
    }

    this.statusText.setText('Click targets to mark — avoid decoys');
    this.statusText.setAlpha(1);
    this.promptText.setText('Move mouse, click to mark');

    this.addPhaseListener('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.reconActive) return;
      for (const t of this.targets) {
        if (!t.marked && Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) < 20) {
          t.marked = true;
          this.reconTotal++;
          if (t.isTarget) {
            this.reconScore += 15;
            AudioManager.get().playSfx('interact');
          } else {
            this.reconScore = Math.max(0, this.reconScore - 5);
            this.showFeedback('DECOY', '#ff8844');
          }
        }
      }
    });

    this.time.addEvent({
      delay: 1800, loop: true,
      callback: () => {
        if (!this.reconActive || this.reconTotal >= 12) return;
        this.targets.push({
          x: 60 + Math.random() * (width - 120),
          y: 80 + Math.random() * (height - 160),
          isTarget: Math.random() > 0.3,
          marked: false,
        });
      },
    });

    this.time.delayedCall(22000, () => this.endRecon());
  }

  private updateRecon(): void {
    const { width } = this.scale;
    this.reconGfx.clear();
    this.crosshair.clear();

    for (const t of this.targets) {
      if (t.marked) {
        this.reconGfx.lineStyle(1, 0x44ff88, 0.6);
        this.reconGfx.strokeCircle(t.x, t.y, 12);
      } else {
        const blink = Math.sin(Date.now() * 0.005) > 0;
        const color = t.isTarget ? 0xff8844 : 0x888888;
        this.reconGfx.fillStyle(color, blink ? 0.6 : 0.3);
        this.reconGfx.fillCircle(t.x, t.y, 6);
        this.reconGfx.lineStyle(1, color, 0.5);
        this.reconGfx.strokeCircle(t.x, t.y, 10);
      }
    }

    // Crosshair
    const p = this.input.activePointer;
    this.crosshair.lineStyle(1, 0xffffff, 0.6);
    this.crosshair.strokeCircle(p.x, p.y, 8);
    this.crosshair.beginPath();
    this.crosshair.moveTo(p.x - 12, p.y); this.crosshair.lineTo(p.x - 4, p.y);
    this.crosshair.moveTo(p.x + 4, p.y); this.crosshair.lineTo(p.x + 12, p.y);
    this.crosshair.moveTo(p.x, p.y - 12); this.crosshair.lineTo(p.x, p.y - 4);
    this.crosshair.moveTo(p.x, p.y + 4); this.crosshair.lineTo(p.x, p.y + 12);
    this.crosshair.strokePath();

    this.reconHudText.setPosition(width - 100, 60).setText(`TAG: ${this.reconTotal}/12`);
  }

  private endRecon(): void {
    if (!this.reconActive) return;
    this.reconActive = false;
    this.score += this.reconScore;
    this.morale = Math.min(100, this.morale + 3);
    this.showFeedback(`RECON COMPLETE\n+${this.reconScore} pts`, '#88ffaa');
    this.time.delayedCall(1500, () => this.nextPhase());
  }

  // ── BASKETBALL (OFF-DUTY) ──
  private startBasketball(): void {
    const { width, height } = this.scale;
    this.power = 0;
    this.powerDir = 1;
    this.shooting = false;
    this.shootReady = false;
    this.hoopScore = 0;
    this.powerBar.clear();

    const court = this.add.graphics().setDepth(0);
    court.fillStyle(0x332211, 1);
    court.fillRect(0, 60, width, height - 60);
    court.lineStyle(1, 0x554433, 0.3);
    court.strokeRect(20, 70, width - 40, height - 90);

    court.fillStyle(0x888888, 1);
    court.fillRect(width - 60, 80, 4, 60);
    court.lineStyle(2, 0xff6644, 1);
    court.strokeCircle(width - 58, 80, 14);
    court.fillStyle(0xff4422, 0.15);
    court.fillCircle(width - 58, 80, 14);
    court.fillStyle(0x4488ff, 1);
    court.fillCircle(80, height - 100, 10);

    this.add.text(width / 2, height - 30, 'Click to start shooting!', {
      fontSize: '11px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(5);

    this.statusText.setText('Off-duty: Basketball — timing shots');
    this.statusText.setAlpha(1);
    this.promptText.setText('Click to shoot!');

    this.addPhaseListener('pointerdown', () => {
      if (this.phaseComplete) return;
      if (!this.shooting) {
        this.shooting = true;
        this.shootReady = true;
        this.power = 0;
        this.powerDir = 1;
      } else if (this.shootReady) {
        this.shootReady = false;
        const accuracy = Math.abs(this.power - 55) / 45;
        const scored = accuracy < 0.4;
        if (scored) {
          this.hoopScore++;
          this.morale = Math.min(100, this.morale + 8);
          this.fatigue = Math.max(0, this.fatigue - 5);
          AudioManager.get().playSfx('interact');
          this.showFeedback('SCORE! +8 Morale', '#44ff88');
        } else {
          this.showFeedback('MISS...', '#ff8844');
        }
        if (this.hoopScore >= 3) {
          const bonus = this.hoopScore * 20;
          this.score += bonus;
          this.showFeedback(`BASKETBALL COMPLETE!\n${this.hoopScore}/3 hoops +${bonus} pts`, '#88ffaa');
          this.shooting = false;
          this.phaseComplete = true;
          this.time.delayedCall(2000, () => this.nextPhase());
        } else {
          this.time.delayedCall(300, () => { this.shootReady = true; this.power = 0; this.powerDir = 1; });
        }
      }
    });
  }

  private updateBasketball(delta: number): void {
    const { width, height } = this.scale;
    this.powerBar.clear();
    this.powerLabel.setVisible(false);

    if (!this.shooting || this.phaseComplete) return;

    if (this.shootReady) {
      this.power += this.powerDir * delta * 0.15;
      if (this.power >= 100) { this.power = 100; this.powerDir = -1; }
      if (this.power <= 0) { this.power = 0; this.powerDir = 1; }

      const barX = width / 2 - 60;
      const barY = height / 2 + 40;
      this.powerBar.fillStyle(0x222222, 0.8);
      this.powerBar.fillRect(barX, barY, 120, 14);
      const pColor = this.power > 70 ? 0x44ff44 : this.power > 30 ? 0xffaa44 : 0xff4444;
      this.powerBar.fillStyle(pColor, 1);
      this.powerBar.fillRect(barX, barY, this.power * 1.2, 14);
      this.powerBar.lineStyle(1, 0x888888, 0.5);
      this.powerBar.strokeRect(barX, barY, 120, 14);

      this.powerLabel.setPosition(width / 2, barY - 14).setText('POWER').setVisible(true);
    }
  }

  // ── DEBRIEF ──
  private startDebrief(): void {
    const totalScore = this.score;
    const grade = totalScore > 300 ? 'A' : totalScore > 200 ? 'B' : totalScore > 100 ? 'C' : 'D';

    this.briefingText.setText(
      `═ DEBRIEF ═\n\nDay ${this.cycleCount + 1} Complete\nScore: ${totalScore}\nGrade: ${grade}\nMorale: ${this.morale}%\nFatigue: ${this.fatigue}%\n\nClick or press E for next cycle`
    );
    this.briefingText.setAlpha(1);
    this.promptText.setText('Press E or click to continue');

    this.addPhaseListener('pointerdown', () => this.nextPhase());
    const keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.addPhaseKey(keyE, () => this.nextPhase());
  }

  private returnToDistrict(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('JobDistrictScene'));
  }
}
