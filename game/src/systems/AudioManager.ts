export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterVolume = 0.5;
  private bgmGain: GainNode | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private initialized = false;

  static get(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch {
      // Web Audio not available
    }
  }

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
  }

  playBgm(style: 'ambient' | 'pacman' | 'mario' | 'dk' = 'ambient'): void {
    this.stopBgm();
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const sr = ctx.sampleRate;
    const duration = style === 'ambient' ? 8 : 4;
    const buf = ctx.createBuffer(1, sr * duration, sr);
    const data = buf.getChannelData(0);

    if (style === 'pacman') {
      const notes = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440];
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noteIdx = Math.floor(t * 4) % notes.length;
        const note = notes[noteIdx];
        const noteT = (t * 4) % 1;
        const env = Math.max(0, 1 - noteT * 4) * Math.min(1, noteT * 30);
        data[i] = Math.sin(2 * Math.PI * note * t) * env * 0.07;
        data[i] += Math.sin(2 * Math.PI * note * 2 * t) * env * 0.03;
        data[i] += Math.sin(2 * Math.PI * 130.81 * t) * 0.02;
      }
    } else if (style === 'mario') {
      const notes = [392, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 440, 392, 523.25, 659.25, 783.99, 659.25, 523.25, 440, 392];
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noteIdx = Math.floor(t * 3) % notes.length;
        const note = notes[noteIdx];
        const noteT = (t * 3) % 1;
        const env = Math.max(0, 1 - noteT * 2.5) * Math.min(1, noteT * 40);
        data[i] = Math.sin(2 * Math.PI * note * t) * env * 0.07;
        data[i] += Math.sin(2 * Math.PI * note * 0.5 * t) * 0.025;
        data[i] += Math.sin(2 * Math.PI * 196 * t) * 0.015;
      }
    } else if (style === 'dk') {
      const notes = [130.81, 164.81, 196, 164.81, 130.81, 110, 130.81, 164.81, 196, 220, 196, 164.81];
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noteIdx = Math.floor(t * 1.5) % notes.length;
        const note = notes[noteIdx];
        const noteT = (t * 1.5) % 1;
        const env = Math.max(0, 1 - noteT * 2) * Math.min(1, noteT * 20);
        data[i] = Math.sin(2 * Math.PI * note * t) * env * 0.1;
        data[i] += Math.sin(2 * Math.PI * note * 0.5 * t) * 0.04;
        data[i] += Math.sin(2 * Math.PI * 65.41 * t) * 0.03;
      }
    } else {
      const notes = [261.63, 329.63, 392.00, 523.25];
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const note = notes[Math.floor((t * 2) % notes.length)];
        const noteT = (t * 2) % 1;
        const env = Math.max(0, 1 - noteT * 3) * Math.min(1, noteT * 20);
        data[i] = Math.sin(2 * Math.PI * note * t) * env * 0.08;
        data[i] += Math.sin(2 * Math.PI * 196 * t) * 0.02;
        data[i] += Math.sin(2 * Math.PI * 261.63 * t) * 0.015;
      }
    }

    this.bgmSource = ctx.createBufferSource();
    this.bgmSource.buffer = buf;
    this.bgmSource.loop = true;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = this.masterVolume * 0.3;
    this.bgmSource.connect(this.bgmGain);
    this.bgmGain.connect(ctx.destination);
    this.bgmSource.start();
  }

  stopBgm(fadeOut = 0): void {
    if (!this.bgmSource || !this.bgmGain) return;
    if (fadeOut > 0 && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, fadeOut / 2);
      setTimeout(() => {
        this.bgmSource?.stop();
        this.bgmSource?.disconnect();
        this.bgmGain?.disconnect();
        this.bgmSource = null;
        this.bgmGain = null;
      }, fadeOut * 1000 + 100);
    } else {
      try { this.bgmSource.stop(); } catch { /* already stopped */ }
      this.bgmSource?.disconnect();
      this.bgmGain?.disconnect();
      this.bgmSource = null;
      this.bgmGain = null;
    }
  }

  playSfx(type: 'step' | 'interact' | 'modalOpen' | 'modalClose' | 'zoneEnter' | 'hover'): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const sr = ctx.sampleRate;
    let duration = 0.1;
    let freq = 440;
    let vol = 0.15;
    let type2: OscillatorType = 'sine';

    switch (type) {
      case 'step':
        freq = 80 + Math.random() * 40;
        duration = 0.05;
        vol = 0.06;
        type2 = 'triangle';
        break;
      case 'interact':
        freq = 660;
        duration = 0.12;
        vol = 0.12;
        type2 = 'sine';
        break;
      case 'modalOpen':
        freq = 523;
        duration = 0.2;
        vol = 0.1;
        type2 = 'sine';
        break;
      case 'modalClose':
        freq = 350;
        duration = 0.15;
        vol = 0.08;
        type2 = 'sine';
        break;
      case 'zoneEnter':
        freq = 440;
        duration = 0.3;
        vol = 0.1;
        type2 = 'sine';
        break;
      case 'hover':
        freq = 880;
        duration = 0.03;
        vol = 0.04;
        type2 = 'sine';
        break;
    }

    const buf = ctx.createBuffer(1, sr * duration, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const env = Math.max(0, 1 - t / duration);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * vol * this.masterVolume;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = this.masterVolume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }
}
