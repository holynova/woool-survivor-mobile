import { assetUrl } from './utils';

export type BgmTrack = 'menu' | 'battle' | 'boss';

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private muted = false;
  private bgmVolume = 0.42;
  private sfxVolume = 0.5;

  // BGM streaming audio elements
  private bgmElements: Record<BgmTrack, HTMLAudioElement | null> = {
    menu: null,
    battle: null,
    boss: null
  };
  private currentBgmTrack: BgmTrack | null = null;
  private bgmFadeInterval: any = null;

  // SFX Throttling to prevent audio stuttering on multi-pickups
  private lastCoinTime = 0;
  private coinStreak = 0;

  constructor() {
    // Audio elements created lazily or on init
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private initBgmElements() {
    if (typeof window === 'undefined') return;
    if (!this.bgmElements.menu) {
      const createAudio = (file: string) => {
        const audio = new Audio(assetUrl(`assets/sound/${file}`));
        audio.loop = true;
        audio.preload = 'none';
        audio.volume = 0;
        return audio;
      };

      try {
        this.bgmElements.menu = createAudio('bgm_menu.mp3');
        this.bgmElements.battle = createAudio('bgm_battle.mp3');
        this.bgmElements.boss = createAudio('bgm_boss.mp3');
      } catch {}
    }
  }

  private loading?:Promise<void>;
  async init(): Promise<void> {
    this.initCtx();
    this.initBgmElements();
    await (this.loading ??= this.preloadAll());
  }

  async loadSound(key: string, url: string): Promise<void> {
    this.initCtx();
    if (!this.ctx) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(key, audioBuffer);
    } catch {}
  }

  async preloadAll(): Promise<void> {
    const list = [
      ['ui_click', assetUrl('assets/sound/ui_click.wav')],
      ['coin', assetUrl('assets/sound/coin.wav')],
      ['potion', assetUrl('assets/sound/potion.wav')],
      ['player_hurt', assetUrl('assets/sound/player_hurt.wav')],
      ['player_die', assetUrl('assets/sound/player_die.wav')],
      ['monster_hurt', assetUrl('assets/sound/monster_hurt.wav')],
      ['monster_die', assetUrl('assets/sound/monster_die.wav')],
      ['skill_slash', assetUrl('assets/sound/skill_slash.wav')],
      ['skill_fireball', assetUrl('assets/sound/skill_fireball.wav')],
      ['skill_lightning', assetUrl('assets/sound/skill_lightning.wav')],
      ['skill_hellthunder', assetUrl('assets/sound/skill_hellthunder.wav')],
      ['skill_firewall', assetUrl('assets/sound/skill_firewall.wav')],
      ['skill_shield', assetUrl('assets/sound/skill_shield.wav')],
      ['skill_talisman', assetUrl('assets/sound/skill_talisman.wav')],
      ['skill_poison', assetUrl('assets/sound/skill_poison.wav')],
      ['skill_shinsu', assetUrl('assets/sound/skill_shinsu.wav')],
      ['skill_repel', assetUrl('assets/sound/skill_repel.wav')],
      ['skill_holyword', assetUrl('assets/sound/skill_holyword.wav')]
    ];

    await Promise.all(list.map(([key, url]) => this.loadSound(key, url)));
  }

  play(key: string, volume = 0.5) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const buffer = this.buffers.get(key);
    if (buffer) {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = volume * this.sfxVolume;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(0);
    } else {
      this.synthesizeRetro(key, volume * this.sfxVolume);
    }
  }

  /**
   * Crisp, satisfying pickup sound for gold coins and exp crystals
   * Throttled with slight musical pitch ascension on combos
   */
  playCoinPickup(tier = 1) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = performance.now();
    if (now - this.lastCoinTime < 42) {
      // Throttle rapid coin vacuum bursts to prevent acoustic distortion
      return;
    }
    if (now - this.lastCoinTime < 350) {
      this.coinStreak = Math.min(8, this.coinStreak + 1);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;

    const buffer = this.buffers.get('coin');
    const basePitch = 0.94 + (tier - 1) * 0.08 + this.coinStreak * 0.035;
    const finalVolume = (0.35 + (tier - 1) * 0.06) * this.sfxVolume;

    if (buffer) {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = Math.max(0.7, Math.min(1.6, basePitch));
      gain.gain.value = Math.min(0.65, finalVolume);
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(0);
    } else {
      // Retro chime synthesizer fallback
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'triangle';
      const freq = 987 * Math.pow(1.059, this.coinStreak);
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.33, t + 0.08);
      gain.gain.setValueAtTime(finalVolume * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  playPotionPickup() {
    this.play('potion', 0.55);
  }

  playBossAlert() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Resonant ancient war gong / alert boom synthesizer
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.85);

    gain.gain.setValueAtTime(0.65 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  playBgm(track: BgmTrack) {
    this.initBgmElements();
    if (this.currentBgmTrack === track) return;

    const prevTrack = this.currentBgmTrack;
    this.currentBgmTrack = track;

    if (this.bgmFadeInterval) {
      clearInterval(this.bgmFadeInterval);
      this.bgmFadeInterval = null;
    }

    const prevAudio = prevTrack ? this.bgmElements[prevTrack] : null;
    const nextAudio = this.bgmElements[track];

    if (!nextAudio) return;

    if (this.muted) {
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
      nextAudio.volume = 0;
      nextAudio.play().catch(() => {});
      return;
    }

    // Smooth crossfade
    nextAudio.volume = 0;
    const playPromise = nextAudio.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }

    let step = 0;
    const maxSteps = 15;
    const targetVol = this.bgmVolume;

    this.bgmFadeInterval = setInterval(() => {
      step++;
      const ratio = step / maxSteps;

      if (prevAudio && !prevAudio.paused) {
        prevAudio.volume = Math.max(0, targetVol * (1 - ratio));
      }
      nextAudio.volume = Math.min(targetVol, targetVol * ratio);

      if (step >= maxSteps) {
        clearInterval(this.bgmFadeInterval);
        this.bgmFadeInterval = null;
        if (prevAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
        nextAudio.volume = targetVol;
      }
    }, 40);
  }

  stopBgm() {
    if (this.bgmFadeInterval) {
      clearInterval(this.bgmFadeInterval);
      this.bgmFadeInterval = null;
    }
    if (this.currentBgmTrack && this.bgmElements[this.currentBgmTrack]) {
      const audio = this.bgmElements[this.currentBgmTrack]!;
      audio.pause();
      audio.currentTime = 0;
      this.currentBgmTrack = null;
    }
  }

  private synthesizeRetro(key: string, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (key.includes('lightning') || key.includes('thunder')) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (key.includes('slash')) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (key.includes('click')) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      if (this.currentBgmTrack && this.bgmElements[this.currentBgmTrack]) {
        this.bgmElements[this.currentBgmTrack]!.volume = 0;
      }
    } else {
      if (this.currentBgmTrack && this.bgmElements[this.currentBgmTrack]) {
        this.bgmElements[this.currentBgmTrack]!.volume = this.bgmVolume;
      }
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  getCurrentBgm(): BgmTrack | null {
    return this.currentBgmTrack;
  }
}

export const sound = new AudioManager();
