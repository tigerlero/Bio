import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    AudioManager.get().init();
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor('#0a1a0a');

    // Floating particles background
    const particles = this.add.graphics();
    const dots: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    for (let i = 0; i < 50; i++) {
      dots.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
      });
    }

    this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        particles.clear();
        for (const d of dots) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < 0 || d.x > width) d.vx *= -1;
          if (d.y < 0 || d.y > height) d.vy *= -1;
          particles.fillStyle(0x44ff88, 0.4);
          particles.fillCircle(d.x, d.y, d.r);
        }
      },
    });

    // Title
    const title = this.add.text(width / 2, height * 0.25, '✦ BIO EXPLORER ✦', {
      fontSize: '48px',
      color: '#44ff88',
      fontFamily: 'monospace',
    });
    title.setOrigin(0.5);

    // Subtitle
    const sub = this.add.text(width / 2, height * 0.35, 'Panagiotis Efstathiadis', {
      fontSize: '20px',
      color: '#88ffbb',
      fontFamily: 'monospace',
    });
    sub.setOrigin(0.5);

    // Description
    const desc = this.add.text(width / 2, height * 0.45,
      'Explore my world — discover projects, jobs, skills, and education.\nWalk around and interact with the world to learn more about me.', {
      fontSize: '14px',
      color: '#aaddcc',
      fontFamily: 'monospace',
      align: 'center',
    });
    desc.setOrigin(0.5);

    // Pulsing start prompt
    const start = this.add.text(width / 2, height * 0.65, 'Press ENTER or SPACE to start', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    start.setOrigin(0.5);

    this.tweens.add({
      targets: start,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 800,
    });

    // Minigames section
    const mgLabel = this.add.text(width / 2, height * 0.72, 'MINIGAMES', {
      fontSize: '13px', color: '#669966', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    const games = [
      { label: '✦ Skill Snake', scene: 'SnakeGameScene' },
      { label: '✦ Project Match', scene: 'ProjectMatchScene' },
      { label: '✦ Campus Quiz', scene: 'CampusQuizScene' },
      { label: '✦ Flappy Job', scene: 'FlappyJobScene' },
    ];
    games.forEach((g, i) => {
      const txt = this.add.text(width / 2, height * (0.76 + i * 0.035), g.label, {
        fontSize: '12px', color: '#88aa88', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => txt.setColor('#ccffcc'));
      txt.on('pointerout', () => txt.setColor('#88aa88'));
      txt.on('pointerdown', () => {
        AudioManager.get().init();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start(g.scene));
      });
    });

    // Back to website link
    const back = this.add.text(width / 2, height * 0.92, '< Back to Website', {
      fontSize: '14px',
      color: '#4488aa',
      fontFamily: 'monospace',
    });
    back.setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#66ccff'));
    back.on('pointerout', () => back.setColor('#4488aa'));
    back.on('pointerdown', () => {
      window.location.href = '../';
    });

    // Init audio + BGM on first interaction
    const startAudio = () => {
      AudioManager.get().init();
      AudioManager.get().playBgm();
      this.startGame();
    };
    this.input.keyboard!.on('keydown-ENTER', () => startAudio());
    this.input.keyboard!.on('keydown-SPACE', () => startAudio());
    this.input.on('pointerdown', () => startAudio());
  }

  private startGame(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('OverworldScene');
    });
  }
}
