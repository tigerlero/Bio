import Phaser from 'phaser';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  public npcName: string;
  public dataId: string;
  private pathTarget: { x: number; y: number } | null = null;
  private pathOrigin: { x: number; y: number };
  private pathSpeed = 20;
  private movingForward = true;
  private logo: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    name: string,
    dataId: string,
    walkRange?: number,
    logoKey?: string,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.npcName = name;
    this.dataId = dataId;
    this.pathOrigin = { x, y };
    this.setImmovable(true);
    this.setDepth(5);

    // Company logo (for job buildings)
    if (logoKey && scene.textures.exists(logoKey)) {
      const tex = scene.textures.get(logoKey);
      const h = tex.getSourceImage().height;
      const scale = 16 / h;
      this.logo = scene.add.image(x, y - 16, logoKey).setScale(scale).setDepth(21);
    }

    // Shadow
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillEllipse(0, 0, 14, 7);
    shadow.setDepth(4);
    this.setData('shadow', shadow);

    // Idle bob
    scene.tweens.add({
      targets: this,
      y: y - 3,
      duration: 1500 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Blink (occasional tint)
    scene.time.addEvent({
      delay: 3000 + Math.random() * 4000,
      loop: true,
      callback: () => {
        this.setTint(0xffffff);
        scene.time.delayedCall(100, () => {
          this.clearTint();
        });
      },
    });

    // Floating label
    const label = scene.add.text(x, y - 28, name, {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 },
    });
    label.setOrigin(0.5);
    label.setDepth(20);
    this.setData('label', label);

    // Path walking
    if (walkRange && walkRange > 0) {
      this.pathTarget = { x: x + (Math.random() > 0.5 ? walkRange : -walkRange), y };
      scene.time.addEvent({
        delay: 3000,
        loop: true,
        callback: () => this.flipPath(),
      });
    }
  }

  private flipPath(): void {
    if (!this.pathTarget) return;
    this.movingForward = !this.movingForward;
  }

  updateLabel(): void {
    const label = this.getData('label') as Phaser.GameObjects.Text;
    if (label) {
      label.setPosition(this.x, this.y - 30);
    }
    const shadow = this.getData('shadow') as Phaser.GameObjects.Graphics;
    if (shadow) {
      shadow.setPosition(this.x, this.y + 10);
    }
    if (this.logo) {
      this.logo.setPosition(this.x, this.y - 16);
    }
  }

  update(): void {
    if (this.pathTarget) {
      const target = this.movingForward ? this.pathTarget : this.pathOrigin;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        const step = this.pathSpeed * 0.016;
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      } else {
        this.movingForward = !this.movingForward;
      }
    }
  }
}
