import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const TILE_SIZE = 32;
const MOVE_SPEED = 200;

export enum PlayerState {
  IDLE = 'idle',
  MOVING = 'moving',
  INTERACTING = 'interacting',
  IN_MENU = 'in_menu',
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  public state: PlayerState = PlayerState.IDLE;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private lastDir: string = 'down';
  private shadow: Phaser.GameObjects.Graphics;
  private footstepTimer = 0;
  coffeeBoostTimer = 0;
  joystickDx = 0;
  joystickDy = 0;
  joystickActive = false;
  interactionPressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_sheet', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(16, 20);
    this.setOffset(4, 12);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.25);
    this.shadow.fillEllipse(0, 0, 14, 8);
    this.shadow.setDepth(4);

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.createAnimations();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('player_idle_down')) {
      for (const dir of ['down', 'up', 'left', 'right']) {
        this.scene.anims.create({
          key: `player_idle_${dir}`,
          frames: [{ key: 'player_sheet', frame: 0 }],
          frameRate: 1,
          repeat: -1,
        });
      }
      this.scene.anims.create({
        key: 'player_walk_down',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.scene.anims.create({
        key: 'player_walk_up',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.scene.anims.create({
        key: 'player_walk_left',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.scene.anims.create({
        key: 'player_walk_right',
        frames: this.scene.anims.generateFrameNumbers('player_sheet', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(delta?: number): void {
    if (this.state === PlayerState.IN_MENU || this.state === PlayerState.INTERACTING) {
      this.setVelocity(0, 0);
      return;
    }

    // Coffee boost timer
    if (this.coffeeBoostTimer > 0 && delta) {
      this.coffeeBoostTimer -= delta / 1000;
    }

    let speed = MOVE_SPEED;
    if (this.coffeeBoostTimer > 0) speed = Math.round(MOVE_SPEED * 1.5);

    let vx = 0;
    let vy = 0;
    let moving = false;
    let dir = this.lastDir;

    if (this.joystickActive) {
      const len = Math.sqrt(this.joystickDx * this.joystickDx + this.joystickDy * this.joystickDy);
      if (len > 0.2) {
        vx = this.joystickDx / len * speed;
        vy = this.joystickDy / len * speed;
        moving = true;
        if (Math.abs(vx) > Math.abs(vy)) {
          dir = vx < 0 ? 'left' : 'right';
        } else {
          dir = vy < 0 ? 'up' : 'down';
        }
      }
    } else {
      const left = this.cursors.left.isDown || this.keyA.isDown;
      const right = this.cursors.right.isDown || this.keyD.isDown;
      const up = this.cursors.up.isDown || this.keyW.isDown;
      const down = this.cursors.down.isDown || this.keyS.isDown;

      if (left) { vx = -speed; dir = 'left'; moving = true; }
      else if (right) { vx = speed; dir = 'right'; moving = true; }

      if (up) { vy = -speed; dir = 'up'; moving = true; }
      else if (down) { vy = speed; dir = 'down'; moving = true; }
    }

    this.setVelocity(vx, vy);
    this.state = moving ? PlayerState.MOVING : PlayerState.IDLE;
    this.lastDir = dir;

    this.shadow.setPosition(this.x, this.y + 10);

    this.footstepTimer += moving ? 1 : 0;
    if (this.footstepTimer > 8) {
      this.footstepTimer = 0;
      AudioManager.get().playSfx('step');
      const dust = this.scene.add.graphics();
      dust.fillStyle(0x886644, 0.4);
      dust.fillCircle(0, 0, 2 + Math.random() * 2);
      dust.setPosition(this.x + (Math.random() - 0.5) * 6, this.y + 12);
      dust.setDepth(3);
      this.scene.tweens.add({
        targets: dust,
        alpha: 0,
        y: dust.y - 8,
        duration: 300,
        onComplete: () => dust.destroy(),
      });
    }

    const animKey = moving ? `player_walk_${dir}` : `player_idle_${dir}`;
    if (this.anims.currentAnim?.key !== animKey) {
      this.play(animKey);
    }
  }

  isInteractPressed(): boolean {
    const keyboardPressed = Phaser.Input.Keyboard.JustDown(this.keyE);
    const joyPressed = this.interactionPressed;
    this.interactionPressed = false;
    return keyboardPressed || joyPressed;
  }
}
