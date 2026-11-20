import { WOOWL_SKILLS } from './config/skills';
import type { HeroClass } from './types';
import { assetUrl } from './utils';

export type BgmTrack = 'menu' | 'battle' | 'boss';

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private muted = false;
  private monsterSound = true;
  private monsterLast = new Map<string, number>();
  private bgmVolume = 0.42;
  private sfxVolume = 0.5;

  private music:HTMLAudioElement|null=null;
  private musicFile='';
  private currentBgmTrack:BgmTrack|null=null;
  private readonly chapterTracks: Record<string,string>={
    sunset_island:'HJLX',central_state:'HJZZ',hot_desert:'HJQGD',
    deadwater_marsh:'HJSWY0-5',frozen_citadel:'HJJD',iron_citadel:'txmc'
  };

  // SFX Throttling to prevent audio stuttering on multi-pickups
  private lastCoinTime = 0;
  private coinStreak = 0;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.muted = localStorage.getItem('woool.mobile.muted') === '1';
      this.monsterSound = localStorage.getItem('woool.mobile.monsters') !== '0';
    } catch {}
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

  async init(role: HeroClass): Promise<void> {
    this.initCtx();

    const sounds=new Set(['ui_click','coin','potion','player_hurt','player_die','monster_hurt','monster_die','skill_holyword']);
    for(const skill of Object.values(WOOWL_SKILLS)) if(skill.classType===role) sounds.add(skill.soundKey);
    if(role==='taoist'){sounds.add('skill_slash');sounds.add('skill_fireball');}
    await Promise.all([...sounds].filter(k=>!this.buffers.has(k)).map(k=>this.loadSound(k,assetUrl('assets/sound/'+k+'.wav'))));
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

  play(key: string, volume = 0.5) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (key === 'monster_hurt' || key === 'monster_die') {
      const now = performance.now();
      if (!this.monsterSound || now - (this.monsterLast.get(key) ?? -100) < 95) return;
      this.monsterLast.set(key, now);
    }
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

  playBgm(track:BgmTrack,chapter='sunset_island') {
    if(typeof Audio==='undefined')return;
    const file=track==='menu' ? 'selectcharacter2' : track==='boss' ? 'HJLX_Fight' : this.chapterTracks[chapter]??'HJLX';
    this.currentBgmTrack=track;
    if(file!==this.musicFile || !this.music){
      this.music?.pause();
      this.music ??= new Audio();
      const path = this.music.canPlayType('audio/ogg; codecs="vorbis"') ? file+'.ogg' : 'compat/'+file+'.mp3';
      this.music.src = assetUrl('assets/woool/music/'+path);
      this.music.loop=true;this.music.preload='none';this.music.volume=this.bgmVolume;
      this.musicFile=file;
    }
    if(!this.muted && this.music.paused)void this.music.play().catch(()=>{});
  }

  stopBgm() {
    this.music?.pause();
    this.music=null;this.musicFile='';this.currentBgmTrack=null;
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
    try { localStorage.setItem('woool.mobile.muted',this.muted?'1':'0'); } catch {}
    if(this.muted)this.music?.pause();
    else if(this.music)void this.music.play().catch(()=>{});
    return this.muted;
  }

  monstersEnabled() { return this.monsterSound; }
  toggleMonsters() {
    this.monsterSound = !this.monsterSound;
    try { localStorage.setItem('woool.mobile.monsters',this.monsterSound?'1':'0'); } catch {}
    return this.monsterSound;
  }

  isMuted(): boolean {
    return this.muted;
  }

  getCurrentBgm(): BgmTrack | null {
    return this.currentBgmTrack;
  }
}

export const sound = new AudioManager();
