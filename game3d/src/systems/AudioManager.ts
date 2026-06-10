export class AudioManager {
  private static _instance: AudioManager;
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private bgmPlaying = false;
  private bgmFadeTimer: number | null = null;

  static get(): AudioManager {
    if (!this._instance) this._instance = new AudioManager();
    return this._instance;
  }

  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0;
    this.bgmGain.connect(this.ctx.destination);
  }

  playBgm(style: 'ambient' | 'runner' = 'ambient', fadeIn = 0.5): void {
    if (!this.ctx || !this.bgmGain || this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + fadeIn);

    const playChord = () => {
      if (!this.ctx || !this.bgmPlaying) return;
      const now = this.ctx.currentTime;

      if (style === 'runner') {
        const notes = [440, 554.37, 659.25, 880, 659.25, 554.37, 440, 554.37, 659.25, 880, 1046.5, 880, 659.25, 554.37, 440, 554.37];
        notes.forEach((freq, i) => {
          const o = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          o.type = 'square';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.025, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
          o.connect(g);
          g.connect(this.bgmGain!);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.35);
        });
        const bass = this.ctx!.createOscillator();
        const bg = this.ctx!.createGain();
        bass.type = 'sawtooth';
        bass.frequency.value = 110;
        bg.gain.setValueAtTime(0.03, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
        bass.connect(bg);
        bg.connect(this.bgmGain!);
        bass.start(now);
        bass.stop(now + 1.6);
        this.bgmFadeTimer = window.setTimeout(playChord, 1600);
      } else {
        const notes = [261.63, 329.63, 392, 523.25];
        notes.forEach((freq, i) => {
          const o = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.04, now + i * 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 1.5);
          o.connect(g);
          g.connect(this.bgmGain!);
          o.start(now + i * 0.15);
          o.stop(now + i * 0.15 + 1.5);
        });
        this.bgmFadeTimer = window.setTimeout(playChord, 2400);
      }
    };
    playChord();
  }

  stopBgm(fadeOut = 0.3): void {
    if (!this.ctx || !this.bgmGain) return;
    this.bgmPlaying = false;
    if (this.bgmFadeTimer !== null) { clearTimeout(this.bgmFadeTimer); this.bgmFadeTimer = null; }
    this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOut);
  }

  playSfx(name: string): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g);
    g.connect(this.ctx.destination);

    switch (name) {
      case 'interact': o.frequency.value = 600; o.type = 'sine'; g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2); o.start(now); o.stop(now + 0.2); break;
      case 'hover': o.frequency.value = 800; o.type = 'sine'; g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.start(now); o.stop(now + 0.08); break;
      case 'zoneEnter': o.frequency.value = 400; o.type = 'sine'; g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4); o.start(now); o.stop(now + 0.4); break;
    }
  }
}
