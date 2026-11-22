import { WOOWL_SKILLS } from './config/skills';
import type { HeroClass } from './types';
import {trialId} from './trial';
import { assetUrl } from './utils';

export type BgmTrack = 'menu' | 'battle' | 'boss';

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string,{controller:AbortController;done:Promise<void>}>();
  private muted = false;
  private monsterSound = true;
  private monsterLast = new Map<string, number>();
  private bgmVolume = 0.42;
  private sfxVolume = 0.5;
  private master?: GainNode;
  private ordinary?: GainNode;
  private monsterVoices = new Set<AudioBufferSourceNode>();
  private activeVoices = 0;
  private duckTimer?: ReturnType<typeof setTimeout>;

  private music:HTMLAudioElement|null=null;
  private musicFile='';
  private currentBgmTrack:BgmTrack|null=null;
  private readonly chapterTracks: Record<string,string>={
    sunset_island:'HJLX',central_state:'HJZZ',hot_desert:'HJQGD',
    deadwater_marsh:'HJSWY0-5',frozen_citadel:'HJJD',iron_citadel:'txmc',serpent_valley:'HJSWY0-5',heaven_tower:'HJQGD'
  };

  // SFX Throttling to prevent audio stuttering on multi-pickups
  private lastCoinTime = -Infinity;
  private coinStreak = 0;

  constructor() {
    if (typeof window === 'undefined' || trialId) return;
    try {
      for (const [key,fallback] of [['music',.42],['effects',.5]] as const) {
        const raw=localStorage.getItem('woool.mobile.volume.'+key);
        const n=raw===null ? fallback : Number(raw);
        if(Number.isFinite(n)) {
          const volume=Math.max(0,Math.min(n,1));
          if(key==='music') this.bgmVolume=volume; else this.sfxVolume=volume;
        }
      }
      this.muted = localStorage.getItem('woool.mobile.muted') === '1';
      this.monsterSound = localStorage.getItem('woool.mobile.monsters') !== '0';
    } catch {}
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.master=this.ctx.createGain();
        this.master.gain.value=this.muted?0:this.sfxVolume;
        this.master.connect(this.ctx.destination);
        this.ordinary=this.ctx.createGain();
        this.ordinary.connect(this.master);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async init(role:HeroClass, skills:string[]):Promise<void> {
    this.initCtx();
    const basics=['ui_click','coin','potion','player_hurt','player_die','monster_hurt','monster_die','skill_holyword'];
    if(role==='taoist')basics.push('skill_slash');
    const opening=new Set([...basics,...this.skillKeys(skills)]);
    this.cancelUnused(opening);
    await Promise.all([...opening].map(k=>this.prepare(k)));
  }

  private skillKeys(skills:readonly string[]) {
    const keys=new Set<string>();
    for(const id of skills) {
      if(WOOWL_SKILLS[id])keys.add(WOOWL_SKILLS[id].soundKey);
      if(id==='shinsu_summon')keys.add('skill_fireball');
      if(id==='summon_skeleton'||id==='enhanced_skeleton')keys.add('skill_slash');
    }
    return keys;
  }

  async prepareSkills(skills:readonly string[]) {
    await Promise.all([...this.skillKeys(skills)].map(k=>this.prepare(k)));
  }

  cancelUnused(keep:ReadonlySet<string>=new Set()) {
    for(const [key,request] of this.pending) {
      if(keep.has(key)) continue;
      this.pending.delete(key);
      request.controller.abort();
    }
  }

  private prepare(key:string) {
    if(this.buffers.has(key))return;
    let request=this.pending.get(key);
    if(!request) {
      const controller=new AbortController();
      const done=this.loadSound(key,assetUrl('assets/sound/'+key+'.wav'),controller.signal).finally(()=>{
        if(this.pending.get(key)?.controller===controller)this.pending.delete(key);
      });
      request={controller,done};
      this.pending.set(key,request);
    }
    return request.done;
  }

  private async loadSound(key: string, url: string, signal:AbortSignal): Promise<void> {
    this.initCtx();
    if (!this.ctx) return;
    try {
      const res = await fetch(url,{signal});
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      if(!signal.aborted)this.buffers.set(key, audioBuffer);
    } catch {}
  }

  play(key: string, volume = 0.5) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const monster=key === 'monster_hurt' || key === 'monster_die';
    const important=key==='player_hurt' || key==='player_die';
    if(!important && this.activeVoices>=10)return;
    if (monster) {
      const now = performance.now();
      if (!this.monsterSound || this.monsterVoices.size>=3 || now - (this.monsterLast.get(key) ?? -100) < 95) return;
      this.monsterLast.set(key, now);
    }
    const buffer = this.buffers.get(key);
    if (buffer) {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(important ? this.master! : this.ordinary!);
      if(monster)this.monsterVoices.add(source);
      this.activeVoices++;
      source.onended=()=>{this.activeVoices--;this.monsterVoices.delete(source);source.disconnect();gain.disconnect();};
      source.start(0);
    } else {
      this.synthesizeRetro(key, volume, important);
    }
  }

  /**
   * Crisp, satisfying pickup sound for gold coins and exp crystals
   * Throttled with slight musical pitch ascension on combos
   */
  playCoinPickup(tier = 1, count = 1) {
    if (this.muted) return;
    this.initCtx();
    const ctx=this.ctx;
    if (!ctx) return;
    const now=ctx.currentTime;
    if(now-this.lastCoinTime<.085) return;
    this.coinStreak=now-this.lastCoinTime<.42 ? this.coinStreak+1 : 0;
    this.lastCoinTime=now;
    const step=[0,2,4,7,9][Math.min(this.coinStreak,4)];
    const pitch=2**(step/12);
    const accent=tier>=2 || count>=3 || this.coinStreak%5===4;
    const buffer=this.buffers.get('coin');
    const strike=(at:number,rate:number,strength:number)=>{
      const gain=ctx.createGain();
      gain.connect(this.ordinary!);
      const duration=buffer ? Math.min(.20,buffer.duration/rate) : .105;
      if(duration<=0) { gain.disconnect();return; }
      gain.gain.setValueAtTime(strength*(buffer?1:.18),at);
      gain.gain.exponentialRampToValueAtTime(.001,at+duration);
      const source=buffer ? ctx.createBufferSource() : ctx.createOscillator();
      if ('buffer' in source) {
        source.buffer=buffer ?? null;
        source.playbackRate.value=rate;
      } else {
        source.type='triangle';
        source.frequency.value=1120*rate;
      }
      source.connect(gain);
      source.onended=()=>{source.disconnect();gain.disconnect()};
      source.start(at);
      source.stop(at+duration);
    };
    strike(now,pitch,accent?1.65:1.3);
    if(accent) strike(now+.045,pitch*1.26,.76);
  }

  playPotionPickup() {
    this.play('potion', 0.55);
  }

  // Briefly lower the music, pickups and routine combat under a critical tell.
  private duckBattleMix() {
    const ctx=this.ctx!, mix=this.ordinary!.gain, now=ctx.currentTime;
    mix.cancelScheduledValues(now);
    mix.setValueAtTime(mix.value,now);
    mix.linearRampToValueAtTime(.32,now+.035);
    mix.setValueAtTime(.32,now+.46);
    mix.linearRampToValueAtTime(1,now+.72);
    if(this.duckTimer!==undefined) clearTimeout(this.duckTimer);
    if(this.music)this.music.volume=this.bgmVolume*.55;
    this.duckTimer=setTimeout(()=>{
      this.duckTimer=undefined;
      if(this.music)this.music.volume=this.bgmVolume;
    },700);
  }

  private tone(start:number,end:number,after:number,duration:number,wave:OscillatorType,volume:number) {
    const ctx=this.ctx!, at=ctx.currentTime+after;
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type=wave;
    osc.frequency.setValueAtTime(start,at);
    osc.frequency.exponentialRampToValueAtTime(end,at+duration);
    gain.gain.setValueAtTime(.001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.012);
    gain.gain.exponentialRampToValueAtTime(.001,at+duration);
    osc.connect(gain);gain.connect(this.master!);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
    osc.start(at);osc.stop(at+duration);
  }

  playBossAlert(tier:'elite'|'lord'|'boss'='boss') {
    if(this.muted || this.sfxVolume===0)return;
    this.initCtx();
    if(!this.ctx)return;
    if(tier!=='elite')this.duckBattleMix();
    if(tier==='elite') this.tone(420,265,0,.25,'triangle',.38);
    if(tier==='lord') {
      this.tone(320,145,0,.27,'triangle',.48);
      this.tone(270,112,.19,.33,'triangle',.48);
    }
    if(tier==='boss') {
      this.tone(245,55,0,.85,'sine',.68);
      this.tone(490,175,.09,.55,'triangle',.32);
    }
  }

  playThreat(kind:'ground'|'charge'|'volley'|'summon') {
    if(this.muted || this.sfxVolume===0)return;
    this.initCtx();
    if(!this.ctx)return;
    this.duckBattleMix();
    switch(kind) {
      case 'ground': this.tone(195,80,0,.39,'triangle',.54); break;
      case 'charge': this.tone(170,620,0,.34,'triangle',.48); break;
      case 'volley': for(const delay of [0,.1,.2])this.tone(760,510,delay,.085,'sine',.46); break;
      case 'summon':
        this.tone(285,350,0,.4,'sine',.47);
        this.tone(420,520,.12,.4,'sine',.43);break;
    }
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
      this.music.loop=true;this.music.preload='none';this.music.volume=this.bgmVolume*(this.duckTimer!==undefined ? .55 : 1);
      this.musicFile=file;
    }
    if(!this.muted && this.music.paused)void this.music.play().catch(()=>{});
  }

  stopBgm() {
    this.music?.pause();
    this.music=null;this.musicFile='';this.currentBgmTrack=null;
  }

  private synthesizeRetro(key: string, volume: number, important:boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.connect(gain);
    gain.connect(important ? this.master! : this.ordinary!);
    this.activeVoices++;
    osc.onended=()=>{this.activeVoices--;osc.disconnect();gain.disconnect();};

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
    if(!trialId)try { localStorage.setItem('woool.mobile.muted',this.muted?'1':'0'); } catch {}
    if(this.master)this.master.gain.value=this.muted?0:this.sfxVolume;
    if(this.muted)this.music?.pause();
    else if(this.music)void this.music.play().catch(()=>{});
    return this.muted;
  }

  volume(channel:'music'|'effects') {
    return channel==='music' ? this.bgmVolume : this.sfxVolume;
  }
  setVolume(channel:'music'|'effects',value:number) {
    if(!Number.isFinite(value))return;
    const volume=Math.max(0,Math.min(1,value));
    if(channel==='music') {
      this.bgmVolume=volume;
      if(this.music)this.music.volume=volume*(this.duckTimer!==undefined ? .55 : 1);
    } else {
      this.sfxVolume=volume;
      if(this.master)this.master.gain.value=this.muted?0:volume;
    }
    if(!trialId)try{localStorage.setItem('woool.mobile.volume.'+channel,String(volume));}catch{}
  }

  setVisible(visible:boolean) {
    if(!visible){
      this.music?.pause();
      if(this.ctx?.state==='running')void this.ctx.suspend().catch(()=>{});
    } else if(!this.muted && this.music) {
      void this.music.play().catch(()=>{});
    }
  }

  monstersEnabled() { return this.monsterSound; }
  toggleMonsters() {
    this.monsterSound = !this.monsterSound;
    if(!this.monsterSound)for(const voice of this.monsterVoices)voice.stop();
    if(!trialId)try { localStorage.setItem('woool.mobile.monsters',this.monsterSound?'1':'0'); } catch {}
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
