import type {
  HeroClass,
  GamePhase,
  DifficultyCurveId,
  SkillQuality,
  PlayerState,
  ActiveSkillState,
  ActivePassiveState,
  MonsterEntity,
  MinionEntity,
  DropEntity,
  DamageNumber,
  EffectEvent, Flight, FlightKind,
  AlertBanner
} from './types';
import { WOOWL_SKILLS, WOOWL_PASSIVES } from './config/skills';
import { WOOWL_CHAPTERS } from './config/chapters';
import {
  AWAKENING_TIME, ENEMY_HEALTH_SCALE, attackPressure,
  ELITE_MILESTONES, MILESTONE_LORDS,
  WOOWL_MONSTERS,
  WOOWL_DIFFICULTY_CURVES,
  evaluateCurveState
} from './config/curves';
import { missiles, FIRST_RANGED_WAVE, rangedWave, type EnemyShot, type MissileKind } from './ranged';
import { attackZones, type DangerZone } from './encounters';
import { gearInfo, freshTraining, type Equipment, type Training } from './config/equipment';
import { sound } from './audio';

import { chapterTerrain, monsterFootprint, PLAYER_RADIUS, WORLD_WIDTH, WORLD_HEIGHT } from './terrain';
export { WORLD_WIDTH, WORLD_HEIGHT } from './terrain';

const RUN_REROLLS = 3;
const SWAP_INTERVAL = 4;

const flightSpeed: Record<FlightKind, number> = {
  fireball: 390, talisman: 320, ghost_fire_curse: 345, meteor: 610, shinsu_hit: 345
};

function choiceTitle(name: string, level: number, isNew: boolean) {
  return isNew ? name + ' · 新' : name + ' · ' + level + '级';
}

export function getQualityColor(quality: SkillQuality = 'common'): string {
  switch (quality) {
    case 'common': return '#d1d8e0';
    case 'rare': return '#52c41a';
    case 'epic': return '#1890ff';
    case 'mythic': return '#a855f7';
    case 'legendary': return '#faad14';
    default: return '#d1d8e0';
  }
}

export function calcDirection(dx: number, dy: number): number {
  const angle = Math.atan2(dy, dx);
  const octant = Math.round((angle + Math.PI / 2) / (Math.PI / 4));
  return (octant % 8 + 8) % 8;
}

export class GameEngine {
  phase: GamePhase = 'lobby';
  heroClass: HeroClass = 'wizard';
  chapterId = 'sunset_island';
  terrain = chapterTerrain(this.chapterId);
  difficultyId: DifficultyCurveId = 'standard';

  runId = '';
  equipment: Equipment = {weapon: 0, armor: 0};
  training: Training = freshTraining();
  dangers: DangerZone[] = [];
  enemyShots: EnemyShot[] = [];
  private nextRangedWaveAt = FIRST_RANGED_WAVE;
  clock = 0;
  wave = 1;
  wavePhaseName = '发育起势';
  waveProgress = 0;
  waveTimer = 0;
  bossSpawned = false;
  bossDefeated = false;

  rerolls = RUN_REROLLS;
  private eliteTimer = 0;
  private spawnedMilestones = new Set<number>();
  private spawnAccumulator = 0;
  private statusTickTimer = 0;
  private shieldReduction = 0.4;
  private thornRatio = 0;

  inputX = 0;
  inputY = 0;

  player: PlayerState = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    hp: 155,
    maxHp: 155,
    mp: 100,
    maxMp: 100,
    level: 1,
    exp: 0,
    maxExp: 6,
    speed: 212,
    gold: 0,
    kills: 0,
    dir: 4,
    moving: false,
    damageBonus: 0,
    cooldownBonus: 0,
    areaBonus: 0,
    pickupRange: 130,
    hpRegen: 0.6,
    invulnerableTime: 0,
    shieldUntil: 0
  };

  activeSkills: ActiveSkillState[] = [];
  activePassives: ActivePassiveState[] = [];

  monsters: MonsterEntity[] = [];
  minions: MinionEntity[] = [];
  drops: DropEntity[] = [];
  damageNumbers: DamageNumber[] = [];
  effects: EffectEvent[] = [];
  flights: Flight[] = [];
  alertBanner: AlertBanner | null = null;

  upgradeChoices: Array<{
    type: 'skill' | 'passive';
    id: string;
    isNew: boolean;
    level: number;
    title: string;
    description: string;
    iconId: number;
    quality?: SkillQuality;
    swap?: boolean;
  }> = [];

  version = 0;
  private nextEntityId = 1;
  private listeners = new Set<() => void>();

  constructor() {
    this.resetForLobby();
  }

  setInput(ix: number, iy: number) {
    this.inputX = ix;
    this.inputY = iy;
  }

  takeEffects(): EffectEvent[] {
    const list = this.effects;
    this.effects = [];
    return list;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.version++;
    this.listeners.forEach(fn => fn());
  }

  resetForLobby() {
    this.phase = 'lobby';
    this.clock = 0;
    this.wave = 1;
    this.wavePhaseName = '发育起势';
    this.waveProgress = 0;
    this.waveTimer = 0;
    this.eliteTimer = 0;
    this.spawnedMilestones.clear();
    this.spawnAccumulator = 0;
    this.statusTickTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.monsters = [];
    this.flights = [];
    this.enemyShots = [];
    this.nextRangedWaveAt = FIRST_RANGED_WAVE;
    this.minions = [];
    this.drops = [];
    this.damageNumbers = [];
    this.effects = [];
    this.alertBanner = null;
    sound.playBgm('menu');
    this.emit();
  }

  start(heroClass: HeroClass, chapterId: string, difficultyId?: DifficultyCurveId, training = freshTraining()) {
    this.rerolls = RUN_REROLLS;
    this.runId = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
    this.training = {...training};
    this.equipment = {weapon: 0, armor: 0};
    this.dangers = [];
    this.upgradeChoices = [];
    this.player.dir = 4;
    this.player.moving = false;
    this.heroClass = heroClass;
    this.chapterId = chapterId;
    this.terrain = chapterTerrain(chapterId);
    if (difficultyId) {
      this.difficultyId = difficultyId;
    }

    this.phase = 'battle';
    this.clock = 0;
    this.wave = 1;
    this.wavePhaseName = '发育起势';
    this.waveProgress = 0;
    this.waveTimer = 0;
    this.eliteTimer = 0;
    this.spawnedMilestones.clear();
    this.spawnAccumulator = 0;
    this.statusTickTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.monsters = [];
    this.flights = [];
    this.enemyShots = [];
    this.nextRangedWaveAt = FIRST_RANGED_WAVE;
    this.minions = [];
    this.drops = [];
    this.damageNumbers = [];
    this.effects = [];
    this.alertBanner = null;
    sound.playBgm('battle',this.chapterId);
    this.activeSkills = [];
    this.activePassives = [];
    this.shieldReduction = 0;
    this.thornRatio = 0;

    this.player.x = WORLD_WIDTH / 2;
    this.player.y = WORLD_HEIGHT / 2;
    this.minions = [];
    this.setInput(0,0);
    if (heroClass === 'warrior') {
      this.player.maxHp = 240;
      this.player.hp = 240;
      this.activeSkills.push({ id: 'attack_slash', level: 1, cdTimer: 0, maxCd: WOOWL_SKILLS.attack_slash.cooldown });
    } else if (heroClass === 'wizard') {
      this.player.maxHp = 155;
      this.player.hp = 155;
      this.activeSkills.push({ id: 'fireball', level: 1, cdTimer: 0, maxCd: WOOWL_SKILLS.fireball.cooldown });
    } else {
      this.player.maxHp = 190;
      this.player.hp = 190;
      this.activeSkills.push({ id: 'soul_talisman', level: 1, cdTimer: 0, maxCd: WOOWL_SKILLS.soul_talisman.cooldown });
      this.spawnMinion('skeleton', 1);
    }

    this.player.level = 1;
    this.applyPassiveEffects();
    this.player.hp = this.player.maxHp;
    this.player.exp = 0;
    this.player.maxExp = 8;
    this.player.gold = 0;
    this.player.kills = 0;
    this.player.x = WORLD_WIDTH / 2;
    this.player.y = WORLD_HEIGHT / 2;
    this.player.invulnerableTime = 1.0;
    this.player.shieldUntil = 0;

    // Seed initial deliberate wanderers at distance to start the match smoothly
    for (let i = 0; i < 3; i++) {
      this.spawnMonsterFromChapter(false, 220 + Math.random() * 75, WOOWL_CHAPTERS[this.chapterId].opening[i%2]);
    }

    this.emit();
  }

  snapshot() {
    return {
      encounterVersion: 1, enemyShots:this.enemyShots, nextRangedWaveAt:this.nextRangedWaveAt,
      tempoVersion: 2, rerolls:this.rerolls, flights:this.flights, runId: this.runId, heroClass: this.heroClass, chapterId: this.chapterId, difficultyId: this.difficultyId,
      phase: this.phase, clock: this.clock, wave: this.wave, wavePhaseName: this.wavePhaseName,
      waveProgress: this.waveProgress, waveTimer: this.waveTimer, bossSpawned: this.bossSpawned, bossDefeated: this.bossDefeated,
      eliteTimer: this.eliteTimer, milestones: [...this.spawnedMilestones], spawnAccumulator: this.spawnAccumulator,
      statusTickTimer: this.statusTickTimer, shieldReduction: this.shieldReduction, thornRatio: this.thornRatio,
      nextEntityId: this.nextEntityId, player: this.player, activeSkills: this.activeSkills, activePassives: this.activePassives,
      monsters: this.monsters, minions: this.minions, drops: this.drops, upgradeChoices: this.upgradeChoices,
      equipment: this.equipment, training: this.training, dangers: this.dangers, alertBanner: this.alertBanner
    };
  }

  restore(saved: ReturnType<GameEngine['snapshot']>) {
    const { milestones, ...state } = structuredClone(saved);
    Object.assign(this, state);
    this.rerolls = Number.isInteger(state.rerolls) ? Math.max(0,Math.min(RUN_REROLLS,state.rerolls)) : RUN_REROLLS;
    this.player.areaBonus = this.activePassives.reduce((sum,p)=>sum+(WOOWL_PASSIVES[p.id]?.effect.areaMod??0)*p.level,0);
    this.terrain = chapterTerrain(this.chapterId);
    this.terrain.settle(this.player, PLAYER_RADIUS);
    for (const m of this.monsters) this.terrain.settle(m, monsterFootprint(m));
    for (const m of this.minions) this.terrain.settle(m, 11);
    for (const d of this.drops) this.terrain.settle(d, 5);
    const guardLevel=this.activeSkills.find(s=>s.id==='summon_skeleton')?.level??0;
    const guardLimit=guardLevel===5 ? 3 : guardLevel>=3 ? 2 : 1;
    let guards = 0;
    for (const m of this.minions) {
      if (m.type !== 'skeleton' || m.name !== '强化骷髅') continue;
      if (++guards > guardLimit && this.activeSkills.some(s => s.id === 'enhanced_skeleton')) m.type = 'enhanced_skeleton';
      else m.name = '骷髅';
    }
    // Older saves kept the display text and icon alongside each pending choice.
    for (const choice of this.upgradeChoices) {
      const def = choice.type === 'skill' ? WOOWL_SKILLS[choice.id] : WOOWL_PASSIVES[choice.id];
      if (!def) continue;
      choice.title = choice.type==='skill' && choice.level===5 ? def.name+' · 觉醒「'+WOOWL_SKILLS[choice.id].upgrades[4].title+'」' : choiceTitle(def.name,choice.level,choice.isNew);
      choice.iconId = def.iconId;
      choice.description = choice.type === 'skill'
        ? WOOWL_SKILLS[choice.id].upgrades.find(u => u.level === choice.level)?.description ?? def.desc
        : def.desc;
    }
    this.enemyShots = state.enemyShots ?? [];
    this.nextRangedWaveAt = state.nextRangedWaveAt ?? Math.max(FIRST_RANGED_WAVE, this.clock + 4);
    if (!state.encounterVersion) {
      for (const m of this.monsters) {
        m.hp *= ENEMY_HEALTH_SCALE;
        m.maxHp *= ENEMY_HEALTH_SCALE;
        m.damage = Math.round(m.damage * attackPressure(this.clock / this.getBossTriggerTime()));
      }
    }
    this.flights=state.flights ?? [];
    this.spawnedMilestones = new Set(state.tempoVersion===2 ? milestones : ELITE_MILESTONES.filter(mark=>mark<=this.clock));
    // A legacy checkpoint keeps elapsed time and its current boss, without stacking overdue elites.
    this.phase = state.phase === 'level_up' ? 'level_up' : 'paused';
    this.effects = [];
    this.damageNumbers = [];
    this.setInput(0, 0);
    this.emit();
  }

  availableReplacements() {
    return Object.values(WOOWL_SKILLS).filter(s => (s.classType === this.heroClass || s.classType==='all')
      && !this.activeSkills.some(active => active.id === s.id)
      && (s.quality !== 'legendary' || this.player.level >= 9)
      && (s.quality !== 'mythic' || this.player.level >= 6));
  }

  changeSkill(id: string, replacement?: string) {
    if (this.phase !== 'paused') return false;
    const index = this.activeSkills.findIndex(s => s.id === id);
    if (index < 0 || (!replacement && this.activeSkills.length <= 1)) return false;
    if (replacement) {
      const def = this.availableReplacements().find(s => s.id === replacement);
      if (!def || this.player.gold < 80) return false;
      this.player.gold -= 80;
      this.activeSkills[index] = {id: def.id, level: 1, maxCd: def.cooldown, cdTimer: def.cooldown};
    } else this.activeSkills.splice(index, 1);

    this.removeSkillEffects(id);
    this.emit();
    return true;
  }

  private removeSkillEffects(id:string) {
    if (id === 'shinsu_summon') this.minions = this.minions.filter(m => m.type !== 'shinsu');
    if (id === 'enhanced_skeleton') this.minions = this.minions.filter(m => m.type !== 'enhanced_skeleton');
    if (id === 'summon_skeleton') {
      this.minions = this.minions.filter(m => m.type !== 'skeleton');
      if (this.heroClass === 'taoist') this.spawnMinion('skeleton');
    }
    if (id === 'wind_shield' || id === 'diamond_body') {
      this.player.shieldUntil = 0;
      this.thornRatio = 0;
    }
  }

  getActiveBoss(): MonsterEntity | undefined {
    return this.monsters.find(m => m.isBoss);
  }

  getBossTriggerTime(): number {
    const chap = WOOWL_CHAPTERS[this.chapterId] || WOOWL_CHAPTERS.sunset_island;
    const curve = WOOWL_DIFFICULTY_CURVES[this.difficultyId] || WOOWL_DIFFICULTY_CURVES.standard;
    return Math.round(chap.durationSeconds * curve.bossTimeScale);
  }

  update(dt: number) {
    if (this.phase !== 'battle') return;

    const clampedDt = Math.min(dt, 0.1);
    this.clock += clampedDt;
    this.waveTimer += clampedDt;

    if (this.alertBanner) {
      this.alertBanner.duration -= clampedDt;
      if (this.alertBanner.duration <= 0) {
        this.alertBanner = null;
      }
    }

    if (this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.hpRegen * clampedDt);
    }
    if (this.player.invulnerableTime > 0) {
      this.player.invulnerableTime -= clampedDt;
    }

    const len = Math.hypot(this.inputX, this.inputY);
    if (len > 0.05) {
      const step = this.player.speed * clampedDt;
      this.terrain.move(this.player, this.inputX / len * step, this.inputY / len * step);
      this.player.dir = calcDirection(this.inputX, this.inputY);
      this.player.moving = true;
    } else {
      this.player.moving = false;
    }

    this.updateFlights(clampedDt);
    if (this.phase === 'battle') this.updateSkills(clampedDt);
    if (this.phase === 'battle') this.updateMinions(clampedDt);
    if (this.phase === 'battle') this.updateMonsterSpawns(clampedDt);
    if (this.phase === 'battle') this.updateMonsterStatuses(clampedDt);
    if (this.phase === 'battle') this.updateDrops(clampedDt);
    this.updateDamageNumbers(clampedDt);
    if (this.phase !== 'battle' || Math.floor(this.clock*10) !== Math.floor((this.clock-clampedDt)*10)) this.emit();
  }

  private updateSkills(dt: number) {
    const curve = WOOWL_DIFFICULTY_CURVES[this.difficultyId] || WOOWL_DIFFICULTY_CURVES.standard;
    const baseCdMult = Math.max(0.32, (1 + this.player.cooldownBonus) * curve.cdMult);

    for (const s of this.activeSkills) {
      s.cdTimer -= dt;
      if (s.cdTimer <= 0) {
        const def = WOOWL_SKILLS[s.id];
        if (!def) continue;

        const triggered = this.triggerSkill(s.id, s.level, def);
        if (triggered) {
          let levelCdMod = 1.0 - (s.level - 1) * 0.06;
          if (s.id === 'moon_blade' && s.level >= 4) levelCdMod *= 0.72;
          if (s.id === 'hell_thunder' && s.level >= 2) levelCdMod *= 0.82;
          const cd = Math.max(0.35, def.cooldown * baseCdMult * levelCdMod);
          s.cdTimer = cd;
          s.maxCd = cd;
        } else {
          s.cdTimer = 0.18;
          s.maxCd = s.maxCd || def.cooldown;
        }
      }
    }
  }

  private launch(kind: FlightKind, origin: {x:number;y:number}, target:{x:number;y:number;id?:number}, damage:number, level:number, radius=0, delay=0) {
    const shot={id:this.nextEntityId++,kind,x:origin.x,y:origin.y,targetX:target.x,targetY:target.y,
      targetId:target.id,damage,level,radius,launchAt:this.clock+delay};
    this.flights.push(shot);
    this.effects.push({id:shot.id,type:kind,x:origin.x,y:origin.y,targetX:target.x,targetY:target.y,level});
  }

  private updateFlights(dt:number) {
    for(const shot of [...this.flights]) {
      if(this.clock<shot.launchAt) continue;
      const target=this.monsters.find(m=>m.id===shot.targetId && m.hp>0);
      if(target){shot.targetX=target.x;shot.targetY=target.y;}
      const dx=shot.targetX-shot.x, dy=shot.targetY-shot.y, distance=Math.hypot(dx,dy);
      const step=flightSpeed[shot.kind]*Math.min(dt,this.clock-shot.launchAt);
      if(distance>step && distance>.01) {
        shot.x+=dx*step/distance; shot.y+=dy*step/distance;
        continue;
      }
      this.flights.splice(this.flights.indexOf(shot),1);
      this.effects.push({id:this.nextEntityId++,type:shot.kind,impact:true,x:shot.targetX,y:shot.targetY,level:shot.level});
      const {kind,level,damage}=shot;
      const nearby=shot.radius ? this.monsters.filter(m=>m.hp>0 && Math.hypot(m.x-shot.targetX,m.y-shot.targetY)<=shot.radius) : [];
      if(kind==='meteor') {
        for(const m of nearby) {
          if(level>=3){m.slowUntil=this.clock+2.5;this.burn(m,damage*.35,3);}
          if(level===5)m.stunUntil=Math.max(m.stunUntil??0,this.clock+.9);
          this.damageEnemy(m,damage,true);
        }
      } else {
        if(target){
          if(kind==='fireball' && level>=3)this.burn(target,damage*.18,2);
          if(kind==='ghost_fire_curse' && level>=3)target.slowUntil=this.clock+1.5;
          if(kind==='talisman' && level>=4)target.stunUntil=this.clock+1;
          if(kind==='talisman' && level===5)target.armorBreak=Math.max(target.armorBreak??0,.3);
          const crit=kind==='fireball' ? level>=4 || Math.random()<.25 : level>=4 || kind==='shinsu_hit';
          this.damageEnemy(target,kind==='fireball' && crit ? Math.round(damage*1.5) : damage,crit);
        }
        for(const m of nearby) {
          if(m===target)continue;
          if(level===5 && (kind==='fireball'||kind==='ghost_fire_curse'))this.burn(m,damage*.22,3);
          const splashRatio = kind === 'shinsu_hit' ? 0.7 : kind === 'ghost_fire_curse' ? 0.5 : 0.45;
          this.damageEnemy(m, Math.round(damage * splashRatio));
        }
      }
      if(this.phase!=='battle')break;
    }
  }

  private burn(m:MonsterEntity,dps:number,seconds:number) {
    m.burnUntil=Math.max(m.burnUntil??0,this.clock+seconds);
    m.burnDps=Math.max(m.burnDps??0,Math.round(dps));
  }

  private triggerSkill(id: string, level: number, def: typeof WOOWL_SKILLS[string]): boolean {
    const damageMultiplier = (1 + this.player.damageBonus) * (1 + (level - 1) * 0.36);
    const areaMultiplier = 1 + this.player.areaBonus + (level - 1) * .03;
    const finalDamage = Math.round(def.damage * damageMultiplier);
    const finalArea = def.area * areaMultiplier;

    if (id === 'dragon_purple_lightning') {
      // Level 1: exactly 1 focused bolt, 0 chain arcs
      // Level 2: 1 bolt + 1 chain arc + shockwave splash
      // Level 3: 2 bolts + 2 chain arcs + stun
      // Level 4: 3 bolts + 3 chain arcs + full screen storm
      const boltCount = level >= 4 ? 3 : level >= 3 ? 2 : 1;
      const targets = this.findNearestEnemies(this.player.x, this.player.y, def.range, boltCount);
      if (targets.length === 0) return false;

      sound.play(def.soundKey);
      const hitIds = new Set<number>();

      for (const mainTarget of targets) {
        if (mainTarget.hp <= 0) continue;
        hitIds.add(mainTarget.id);
        this.damageEnemy(mainTarget, finalDamage, true);
        if (level >= 3) {
          mainTarget.stunUntil = Math.max(mainTarget.stunUntil || 0, this.clock + 0.8);
        }
        this.effects.push({
          id: this.nextEntityId++,
          type: 'lightning',
          x: mainTarget.x,
          y: mainTarget.y,
          level
        });

        // Localized electric shockwave splash around the single strike point
        const shockRadius = finalArea * (level >= 3 ? 0.85 : 0.70);
        const shockSplash = this.monsters.filter(
          m => !hitIds.has(m.id) && m.hp > 0 && Math.hypot(m.x - mainTarget.x, m.y - mainTarget.y) <= shockRadius
        );
        for (const sMob of shockSplash) {
          hitIds.add(sMob.id);
          if(level===5)sMob.stunUntil=Math.max(sMob.stunUntil??0,this.clock+.8);
          this.damageEnemy(sMob, Math.round(finalDamage * 0.58), false);
        }

        // Chain lightning arcs: Level 1 = 0 chains! Level 2 = 1, Level 3 = 2, Level 4 = 3
        const chainMax = level >= 4 ? 3 : level === 3 ? 2 : level === 2 ? 1 : 0;
        if (chainMax > 0) {
          const chains = this.monsters
            .filter(m => !hitIds.has(m.id) && m.hp > 0 && Math.hypot(m.x - mainTarget.x, m.y - mainTarget.y) <= (level >= 4 ? 220 : 175))
            .slice(0, chainMax);

          for (const c of chains) {
            hitIds.add(c.id);
            const dmgRatio = level >= 4 ? 0.85 : 0.65;
            this.damageEnemy(c, Math.round(finalDamage * dmgRatio), level >= 4);
            if (level >= 3) {
              c.stunUntil = Math.max(c.stunUntil || 0, this.clock + 0.5);
            }
            this.effects.push({
              id: this.nextEntityId++,
              type: 'lightning',
              x: c.x,
              y: c.y,
              level
            });
          }
        }
      }
      return true;
    }

    if (id === 'moon_blade') {
      const reach = finalArea * (level >= 3 ? 1.04 : 1.0);
      const targets = this.monsters.filter(m => Math.hypot(m.x - this.player.x, m.y - this.player.y) <= reach);
      if (targets.length === 0) return false;

      sound.play(def.soundKey);
      const bladeDir = targets[0]
        ? calcDirection(targets[0].x - this.player.x, targets[0].y - this.player.y)
        : this.player.dir;
      this.effects.push({
        id: this.nextEntityId++,
        type: 'blade_arc',
        x: this.player.x,
        y: this.player.y,
        dir: bladeDir,
        radius: reach,
        level
      });

      const knockbackDist = level >= 2 ? 75 : 52;
      for (const t of targets) {
        if(level===5)t.slowUntil=Math.max(t.slowUntil??0,this.clock+2);
        this.damageEnemy(t, finalDamage, true);
        const angle = Math.atan2(t.y - this.player.y, t.x - this.player.x);
        const push = t.isBoss ? knockbackDist * 0.25 : knockbackDist;
        this.terrain.move(t, Math.cos(angle) * push, Math.sin(angle) * push, monsterFootprint(t));
      }
      return true;
    }

    if (id === 'enhanced_skeleton') {
      const desiredCount = level >= 4 ? 3 : level >= 2 ? 2 : 1;
      const currentSkeletons = this.minions.filter(m => m.type === 'enhanced_skeleton');
      if (currentSkeletons.length < desiredCount) {
        this.spawnMinion('enhanced_skeleton', level);
        sound.play(def.soundKey);
      }
      for (const m of currentSkeletons) {
        m.damage = Math.round(35 * (1 + (level - 1) * 0.38));
        m.speed = level >= 2 ? 290 : 245;
      }
      return true;
    }

    if (id === 'ghost_fire_curse') {
      // Level 1: exactly 1 talisman, no splash
      // Level 2: 2 talismans + splash
      // Level 3: 3 talismans + slow
      // Level 4: 5 talismans
      const talismanCount = level >= 4 ? 5 : level === 3 ? 3 : level === 2 ? 2 : 1;
      const targets = this.findNearestEnemies(this.player.x, this.player.y, def.range, talismanCount);
      if (targets.length === 0) return false;

      sound.play(def.soundKey);
      for (const target of targets) this.launch('ghost_fire_curse',this.player,target,finalDamage,level,level>=3 ? 75 : level>=2 ? 60 : 0);
      return true;
    }

    if (id === 'celestial_meteor') {
      // Level 1: exactly 1 meteor
      // Level 2: 2 meteors
      // Level 3: 3 meteors + slow & burn
      // Level 4: 5 meteors
      const meteorCount = level >= 4 ? 5 : level === 3 ? 3 : level === 2 ? 2 : 1;
      const candidates = this.findNearestEnemies(this.player.x, this.player.y, def.range, meteorCount);
      if (candidates.length === 0) return false;

      sound.play(def.soundKey);
      for (let i = 0; i < meteorCount; i++) {
        const anchor = candidates[i % candidates.length];
        if (!anchor) continue;
        const impactX = anchor.x + (i > 0 ? (Math.random() - 0.5) * 90 : 0);
        const impactY = anchor.y + (i > 0 ? (Math.random() - 0.5) * 90 : 0);
        this.launch('meteor',{x:impactX,y:impactY-360},{x:impactX,y:impactY},finalDamage,level,finalArea,i*.13);
      }
      return true;
    }

    if (id === 'hell_thunder') {
      const reach = finalArea * (level >= 4 ? 1.06 : level >= 2 ? 1.03 : 1.0);
      const inRange = this.monsters.filter(m => Math.hypot(m.x - this.player.x, m.y - this.player.y) <= reach);
      if (inRange.length === 0) return false;

      sound.play(def.soundKey);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'hell_thunder',
        x: this.player.x,
        y: this.player.y,
        radius: reach,
        level
      });

      const hits = level >= 3 ? 2 : 1;
      for (const m of inRange) {
        if (level >= 4) m.armorBreak = Math.max(m.armorBreak || 0, 0.35);
        this.damageEnemy(m, Math.round(finalDamage * (hits === 2 ? 1.45 : 1.0)), true);
        if(level===5)m.stunUntil=Math.max(m.stunUntil??0,this.clock+1);
        if (m.hp > 0) {
          const angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
          const push = m.isBoss ? 25 : level >= 3 ? 95 : 65;
          this.terrain.move(m, Math.cos(angle) * push, Math.sin(angle) * push, monsterFootprint(m));
        }
      }
      return true;
    }

    if (id === 'poison_cloud') {
      const target = this.findNearestEnemy(this.player.x, this.player.y, def.range);
      if (!target) return false;

      const cloudRadius = finalArea * (level >= 2 ? 1.04 : 1.0);
      const inRange = this.monsters.filter(m => Math.hypot(m.x - target.x, m.y - target.y) <= cloudRadius);
      if (inRange.length === 0) return false;

      sound.play(def.soundKey);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'poison',
        x: target.x,
        y: target.y,
        radius: cloudRadius,
        level
      });

      for (const m of inRange) {
        const detonation=level===5 && (m.poisonUntil??0)>this.clock ? m.poisonDps??0 : 0;
        m.poisonUntil = Math.max(m.poisonUntil || 0, this.clock + (level >= 2 ? 6.0 : 4.0));
        m.poisonDps = Math.max(m.poisonDps || 0, Math.round(finalDamage * 0.85));
        m.armorBreak = Math.max(m.armorBreak || 0, level >= 4 ? 0.45 : 0.2);
        if (level >= 4) {
          m.slowUntil = Math.max(m.slowUntil || 0, this.clock + 4.0);
        }
        this.damageEnemy(m, finalDamage+detonation, false);
      }
      return true;
    }

    if (id === 'shinsu_summon') {
      const desired = level >= 4 ? 2 : 1;
      const existing = this.minions.filter(m => m.type === 'shinsu');
      if (existing.length < desired) {
        this.spawnMinion('shinsu', level);
        sound.play(def.soundKey);
      }
      for (const m of existing) {
        m.damage = Math.round(58 * (1 + (level - 1) * 0.35));
      }
      return true;
    }

    if (id === 'assault_dash') {
      const dashDist = level >= 2 ? 210 : 165;
      // Align 0..7 facing octant (0 = up = -PI/2) with math radians
      const angle = (this.player.dir / 8) * Math.PI * 2 - Math.PI / 2;
      const startX = this.player.x;
      const startY = this.player.y;
      this.terrain.move(this.player, Math.cos(angle)*dashDist, Math.sin(angle)*dashDist);
      const impactR = level >= 3 ? 113 : 103;
      this.player.invulnerableTime = Math.max(this.player.invulnerableTime, level >= 4 ? 0.7 : 0.4);

      sound.play(def.soundKey);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'dash',
        x: startX,
        y: startY,
        targetX: this.player.x,
        targetY: this.player.y,
        dir: this.player.dir,
        radius: impactR,
        level
      });

      const inPath = this.monsters.filter(m => Math.hypot(m.x - this.player.x, m.y - this.player.y) <= impactR);
      for (const m of inPath) {
        if(level===5)m.armorBreak=Math.max(m.armorBreak??0,.35);
        m.stunUntil = Math.max(m.stunUntil || 0, this.clock + 0.7);
        this.damageEnemy(m, Math.round(finalDamage * (level >= 4 ? 1.45 : 1.0)), true);
      }
      return true;
    }

    if (id === 'diamond_body') {
      sound.play(def.soundKey);
      this.player.shieldUntil = this.clock + 4.5 + (level - 1) * 0.9;
      this.shieldReduction = Math.min(0.68, 0.38 + (level - 1) * 0.08);
      if(level===5)this.player.hp=Math.min(this.player.maxHp,this.player.hp+Math.round(this.player.maxHp*.06));
      this.thornRatio = level >= 2 ? 0.55 : 0;
      this.effects.push({
        id: this.nextEntityId++,
        type: 'diamond_body',
        x: this.player.x,
        y: this.player.y,
        radius: 65,
        level
      });
      return true;
    }

    if (id === 'wind_shield') {
      sound.play(def.soundKey);
      this.player.shieldUntil = this.clock + 5.5 + (level - 1) * 0.8;
      this.shieldReduction = Math.max(this.shieldReduction, 0.22 + (level - 1) * 0.08);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'wind_shield',
        x: this.player.x,
        y: this.player.y,
        radius: finalArea,
        level
      });
      const nearby = this.monsters.filter(m => Math.hypot(m.x - this.player.x, m.y - this.player.y) <= finalArea);
      for (const m of nearby) {
        if(level===5)m.slowUntil=Math.max(m.slowUntil??0,this.clock+3);
        this.damageEnemy(m, finalDamage, false);
        const angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
        const push = m.isBoss ? 25 : 85;
        this.terrain.move(m, Math.cos(angle) * push, Math.sin(angle) * push, monsterFootprint(m));
      }
      return true;
    }

    if (id === 'fire_sword') {
      const target = this.findNearestEnemy(this.player.x, this.player.y, def.range + (level >= 3 ? 50 : 0));
      if (!target) return false;

      sound.play(def.soundKey);
      const fireDx = target.x - this.player.x;
      const fireDy = target.y - this.player.y;
      this.effects.push({
        id: this.nextEntityId++,
        type: 'fire_slash',
        x: this.player.x + fireDx * 0.15,
        y: this.player.y + fireDy * 0.15,
        dir: calcDirection(fireDx, fireDy),
        level
      });

      const burstMult = level >= 4 ? 1.8 : 1.45;
      const cleaveR = level >= 3 ? 88 : 80;
      const hitList = this.monsters.filter(m => Math.hypot(m.x - target.x, m.y - target.y) <= cleaveR);
      for (const m of hitList) {
        this.damageEnemy(m, Math.round(finalDamage * burstMult * (level===5 && (m.burnUntil??0)>this.clock ? 1.6 : 1)), true);
        if (level >= 2) {
          m.burnUntil = Math.max(m.burnUntil || 0, this.clock + 3.0);
            m.burnDps = Math.max(m.burnDps || 0, Math.round(finalDamage * .18));
        }
      }
      return true;
    }

    if (id === 'ice_roar') {
      const target = this.findNearestEnemy(this.player.x, this.player.y, def.range);
      if (!target) return false;
      sound.play(def.soundKey);
      const iceRadius = finalArea * (level >= 3 ? 1.05 : 1.0);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'ice_roar',
        x: target.x,
        y: target.y,
        radius: iceRadius,
        level
      });
      const inRange = this.monsters.filter(m => Math.hypot(m.x - target.x, m.y - target.y) <= iceRadius);
      for (const m of inRange) {
        const shatter=level===5 && (m.slowUntil??0)>this.clock;
        m.slowUntil = Math.max(m.slowUntil || 0, this.clock + (level >= 4 ? 3.5 : 2.2));
        if (level >= 4) m.stunUntil = Math.max(m.stunUntil || 0, this.clock + 1.2);
        this.damageEnemy(m, shatter ? Math.round(finalDamage*1.6) : finalDamage, level >= 3);
      }
      return true;
    }

    if (id === 'fireball') {
      const fireballCount = level >= 4 ? 3 : (level >= 3 ? 2 : 1);
      const targets = this.findNearestEnemies(this.player.x, this.player.y, def.range, fireballCount);
      if (targets.length === 0) return false;

      sound.play(def.soundKey);
      for (const target of targets) this.launch('fireball',this.player,target,finalDamage,level,level>=4 ? 75 : 0);
      return true;
    }

    if (id === 'lightning_strike') {
      const strikeCount = level >= 4 ? 3 : (level >= 3 ? 2 : 1);
      const targets = this.findNearestEnemies(this.player.x, this.player.y, def.range, strikeCount);
      if (targets.length === 0) return false;

      sound.play(def.soundKey);
      for (const target of targets) {
        this.effects.push({
          id: this.nextEntityId++,
          type: 'lightning_strike',
          x: target.x,
          y: target.y,
          level
        });
        if(level===5)target.armorBreak=Math.max(target.armorBreak??0,.30);
        this.damageEnemy(target, finalDamage, level >= 3);
        const stunDuration = level >= 3 ? 0.8 : 0.4;
        target.stunUntil = Math.max(target.stunUntil || 0, this.clock + stunDuration);
      }
      return true;
    }

    if (id === 'hellfire') {
      const target = this.findNearestEnemy(this.player.x, this.player.y, def.range + (level >= 2 ? 80 : 0));
      if (!target) return false;

      sound.play(def.soundKey);
      const hdx = target.x - this.player.x;
      const hdy = target.y - this.player.y;
      const hDist = Math.hypot(hdx, hdy) || 1;
      const ndx = hdx / hDist;
      const ndy = hdy / hDist;
      const fireLen = def.range + (level >= 2 ? 80 : 0);
      const fireWidth = 65;


      this.effects.push({
        id: this.nextEntityId++,
        type: 'hellfire',
        x: this.player.x,
        y: this.player.y,
        targetX: this.player.x + ndx * fireLen,
        targetY: this.player.y + ndy * fireLen,
        level
      });

      if(level===5)this.effects.push({id:this.nextEntityId++,type:'hellfire',x:this.player.x,y:this.player.y,targetX:this.player.x-ndx*fireLen,targetY:this.player.y-ndy*fireLen,level});
      for (const m of this.monsters) {
        if (m.hp <= 0) continue;
        const vmx = m.x - this.player.x;
        const vmy = m.y - this.player.y;
        const proj = vmx * ndx + vmy * ndy;
        if (proj >= (level===5 ? -fireLen : 0) && proj <= fireLen) {
          const perp = Math.abs(-ndy * vmx + ndx * vmy);
          if (perp <= fireWidth) {
            this.damageEnemy(m, finalDamage, level >= 4);
            if (level >= 3) {
              m.burnUntil = Math.max(m.burnUntil || 0, this.clock + 3.0);
            m.burnDps = Math.max(m.burnDps || 0, Math.round(finalDamage * .18));
            }
          }
        }
      }
      return true;
    }

    if (id === 'attack_slash') {
      const hitRadius = level >= 3 ? 95 : 85;
      const target = this.findNearestEnemy(this.player.x,this.player.y,hitRadius);
      if (!target) return false;

      sound.play(def.soundKey);
      const slashDir = calcDirection(target.x - this.player.x, target.y - this.player.y);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'attack_slash',
        x: this.player.x + (target.x - this.player.x) * 0.4,
        y: this.player.y + (target.y - this.player.y) * 0.4,
        dir: slashDir,
        level
      });

      if(level===5)this.effects.push({id:this.nextEntityId++,type:'attack_slash',x:this.player.x,y:this.player.y,dir:(slashDir+4)%8,level});
      const pushDist = level >= 2 ? 65 : 45;
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.player.x, m.y - this.player.y) <= hitRadius) {
          const mAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
          const diff = Math.abs(mAngle - Math.atan2(target.y - this.player.y, target.x - this.player.x));
          if (diff <= 1.2 || diff >= Math.PI * 2 - 1.2 || (level===5 && Math.abs(diff-Math.PI)<=1.2)) {
            const isCrit = level >= 4 && Math.random() < 0.35;
            this.damageEnemy(m, isCrit ? Math.round(finalDamage * 1.6) : finalDamage, isCrit);
            const push = m.isBoss ? pushDist * 0.2 : pushDist;
            this.terrain.move(m, Math.cos(mAngle) * push, Math.sin(mAngle) * push, monsterFootprint(m));
          }
        }
      }
      return true;
    }

    if (id === 'assassination_sword') {
      const pierceLen = def.range * (level >= 3 ? 1.3 : 1);
      const target = this.findNearestEnemy(this.player.x, this.player.y, pierceLen);
      if (!target) return false;

      sound.play(def.soundKey);
      const adx = target.x - this.player.x;
      const ady = target.y - this.player.y;
      const aDist = Math.hypot(adx, ady) || 1;
      const andx = adx / aDist;
      const andy = ady / aDist;
      const swordDir = calcDirection(adx, ady);

      this.effects.push({
        id: this.nextEntityId++,
        type: 'assassination_sword',
        x: this.player.x + andx * (def.range * 0.5),
        y: this.player.y + andy * (def.range * 0.5),
        dir: swordDir,
        level
      });


      for (const m of this.monsters) {
        if (m.hp <= 0) continue;
        const vmx = m.x - this.player.x;
        const vmy = m.y - this.player.y;
        const proj = vmx * andx + vmy * andy;
        if (proj >= 0 && proj <= pierceLen) {
          const perp = Math.abs(-andy * vmx + andx * vmy);
          if (perp <= 45) {
            if(level===5)m.armorBreak=Math.max(m.armorBreak??0,.4);
            this.damageEnemy(m, finalDamage, level >= 4);
          }
        }
      }
      return true;
    }

    if (id === 'soul_talisman') {
      const talismanCount = level >= 4 ? 4 : (level >= 3 ? 2 : 1);
      const targets = this.findNearestEnemies(this.player.x, this.player.y, def.range, talismanCount);
      if (targets.length === 0) return false;

      sound.play(def.soundKey);
      for (const target of targets) this.launch('talisman',this.player,target,finalDamage,level,0);
      return true;
    }

    if (id === 'heal_spell') {
      sound.play(def.soundKey);
      if(level===5)this.player.invulnerableTime=Math.max(1,this.player.invulnerableTime);
      const healAmount = level >= 4 ? 110 : level >= 3 ? 80 : (level >= 2 ? 55 : 35);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'heal_spell',
        x: this.player.x,
        y: this.player.y,
        level
      });
      if (level >= 3) {
        for (const minion of this.minions) {
          minion.hp = minion.maxHp;
        }
      }
      return true;
    }

    if (id === 'summon_skeleton') {
      const desiredCount = level === 5 ? 3 : level >= 3 ? 2 : 1;
      const currentSkeletons = this.minions.filter(m => m.type === 'skeleton');
      if (currentSkeletons.length < desiredCount) {
        this.spawnMinion('skeleton', level);
        sound.play(def.soundKey);
      }
      for (const m of currentSkeletons) {
        m.damage = Math.round(36 * (1 + (level - 1) * 0.35));
        m.speed = level >= 2 ? 280 : 240;
      }
      return true;
    }

    if (id === 'thunder_sword') {
      const target = this.findNearestEnemy(this.player.x, this.player.y, def.range + 60);
      if (!target) return false;
      sound.play(def.soundKey);
      const tdx = target.x - this.player.x;
      const tdy = target.y - this.player.y;
      const swordDir = calcDirection(tdx, tdy);

      this.effects.push({
        id: this.nextEntityId++,
        type: 'thunder_sword',
        x: target.x,
        y: target.y,
        dir: swordDir,
        level
      });

      const thunderRadius = finalArea * (level >= 2 ? 1.04 : 1.0);
      for (const m of this.monsters) {
        if (Math.hypot(m.x - target.x, m.y - target.y) <= thunderRadius) {
          if(level===5)m.slowUntil=Math.max(m.slowUntil??0,this.clock+4);
          this.damageEnemy(m, finalDamage, true);
          m.stunUntil = Math.max(m.stunUntil || 0, this.clock + 1.2);
        }
      }
      return true;
    }

    if (id === 'lion_roar') {
      sound.play(def.soundKey);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'lion_roar',
        x: this.player.x,
        y: this.player.y,
        radius: finalArea,
        level
      });
      const inRange = this.monsters.filter(m => Math.hypot(m.x - this.player.x, m.y - this.player.y) <= finalArea);
      if(level===5)this.player.hp=Math.min(this.player.maxHp,this.player.hp+Math.min(24,inRange.length*2));
      for (const m of inRange) {
        m.stunUntil = Math.max(m.stunUntil || 0, this.clock + (level >= 4 ? 2.8 : 1.4));
        this.damageEnemy(m, finalDamage, true);
        const ang = Math.atan2(m.y - this.player.y, m.x - this.player.x);
        this.terrain.move(m, Math.cos(ang)*90, Math.sin(ang)*90, monsterFootprint(m));
      }
      return true;
    }

    return false;
  }

  private updateMinions(dt: number) {
    for (const m of this.minions) {
      m.attackCd -= dt;

      if (!m.targetEnemyId || !this.monsters.some(e => e.id === m.targetEnemyId)) {
        const closest = this.findNearestEnemy(m.x, m.y, 500);
        m.targetEnemyId = closest ? closest.id : null;
      }

      const target = this.monsters.find(e => e.id === m.targetEnemyId);
      if (target) {
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const dist = Math.hypot(dx, dy);
        m.dir = calcDirection(dx, dy);

        const ranged=m.type==='shinsu' && this.activeSkills.some(s=>s.id==='shinsu_summon' && s.level===5);
        if (dist > (ranged ? 180 : 54)) {
          this.terrain.move(m, dx / dist * m.speed * dt, dy / dist * m.speed * dt, 11, m.id%2 ? 1 : -1);
        } else if (m.attackCd <= 0) {
          if(m.type==='shinsu'){
            this.launch('shinsu_hit',m,target,m.damage,1,95);
            sound.play('skill_fireball'); m.attackCd=.9;
            continue;
          }
          if(m.type==='enhanced_skeleton' && this.activeSkills.some(s=>s.id==='enhanced_skeleton' && s.level===5))target.armorBreak=Math.max(target.armorBreak??0,.35);
          this.damageEnemy(target, m.damage, true);
          const cleaveR = 65;
          for (const adj of this.monsters) {
            if (adj.id !== target.id && adj.hp > 0 && Math.hypot(adj.x - target.x, adj.y - target.y) <= cleaveR) {
              this.damageEnemy(adj, Math.round(m.damage * 0.7), false);
            }
          }
          sound.play('skill_slash');
          this.effects.push({
            id: this.nextEntityId++,
            type: 'skeleton_hit',
            x: target.x,
            y: target.y,
            targetX: target.x, targetY: target.y,
            dir: m.dir
          });
          m.attackCd = .58;
        }
      } else {
        const dx = this.player.x - m.x;
        const dy = this.player.y - m.y;
        const distToPlayer = Math.hypot(dx, dy);
        if (distToPlayer > 85) {
          m.dir = calcDirection(dx, dy);
          this.terrain.move(m, dx / distToPlayer * m.speed * dt, dy / distToPlayer * m.speed * dt, 11, m.id%2 ? 1 : -1);
        }
      }
    }
  }

  private spawnMinion(type: MinionEntity['type'], level = 1) {
    const minion: MinionEntity = {
      id: this.nextEntityId++,
      type,
      name: {skeleton: '骷髅', enhanced_skeleton: '强化骷髅', shinsu: '神兽'}[type],
      x: this.player.x + (Math.random() - 0.5) * 65,
      y: this.player.y + (Math.random() - 0.5) * 65,
      dir: 4,
      hp: type !== 'shinsu' ? 280 : 580,
      maxHp: type !== 'shinsu' ? 280 : 580,
      damage: Math.round((type !== 'shinsu' ? 35 : 58) * (1 + (level - 1) * 0.35)),
      speed: type !== 'shinsu' ? 245 : 210,
      targetEnemyId: null,
      attackCd: 0.45
    };
    this.terrain.settle(minion, 11);
    this.minions.push(minion);
    this.effects.push({
      id: this.nextEntityId++,
      type: type === 'skeleton' ? 'summon_skeleton' : type,
      level,
      x: minion.x,
      y: minion.y
    });
  }

  private updateMonsterSpawns(dt: number) {
    const chap = WOOWL_CHAPTERS[this.chapterId] || WOOWL_CHAPTERS.sunset_island;
    const curve = WOOWL_DIFFICULTY_CURVES[this.difficultyId] || WOOWL_DIFFICULTY_CURVES.standard;
    const bossTime = this.getBossTriggerTime();

    const state = evaluateCurveState(this.difficultyId, chap.chapterDifficulty, this.clock, bossTime);
    this.wave = state.phaseIndex;
    this.wavePhaseName = state.phaseName;
    this.waveProgress = Math.min(1, state.progress);

    // Accumulator-based smooth spawning
    this.spawnAccumulator += state.spawnChancePerSec * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      if (this.monsters.length < state.targetCount) {
        this.spawnMonsterFromChapter(false);
      }
    }

    if (this.clock >= this.nextRangedWaveAt) {
      const wave = rangedWave(this.clock);
      const active = this.monsters.filter(m => m.typeId === chap.rangedType).length;
      for (let i = 0; i < Math.min(wave.count, wave.cap - active); i++) {
        const elite = this.clock >= 360 && i === 1 && Math.random() < .22;
        this.spawnMonsterFromChapter(elite, 305 + Math.random() * 70, chap.rangedType);
      }
      this.nextRangedWaveAt = this.clock + wave.interval;
    }

    this.advanceEnemyShots(dt);
    for (const [index,mark] of ELITE_MILESTONES.entries()) {
      if(this.clock>=mark && !this.spawnedMilestones.has(mark)){
        this.spawnedMilestones.add(mark);
        this.spawnMilestoneElite((index+1) as 1|2|3);
      }
    }

    // Periodic Minor Elite Spawn
    if (this.clock >= 30) this.eliteTimer += dt;
    if (this.eliteTimer >= curve.eliteInterval) {
      this.eliteTimer = 0;
      const eliteCount = this.difficultyId === 'hell' || state.progress > 0.65 ? 2 : 1;
      for (let i = 0; i < eliteCount; i++) {
        this.spawnMonsterFromChapter(true);
      }
    }

    // Chapter Boss Arrival
    if (this.clock >= bossTime && !this.bossSpawned) {
      this.spawnBoss();
    }

    // Move monsters & handle diverse AI behaviors
    const meleeAttackers: MonsterEntity[] = [];
    for (const m of this.monsters) {
      if (m.stunUntil && this.clock < m.stunUntil) {
        m.aim = undefined;
        continue;
      }

      const dx = this.player.x - m.x;
      const dy = this.player.y - m.y;
      const dist = Math.hypot(dx, dy) || .001;
      m.dir = calcDirection(dx, dy);

      // A slower walk at every difficulty, including monsters restored from older saves.
      let moveSpeed = m.speed * .74;
      if (m.slowUntil && this.clock < m.slowUntil) {
        moveSpeed *= 0.55;
      }

      // Differentiated movement AI:
      let vx = (dx / dist) * moveSpeed;
      let vy = (dy / dist) * moveSpeed;

      if (m.typeId === 'snake') {
        // Fast slithering serpentine wiggle
        const perpX = (-dy / dist) * Math.sin(this.clock * 4.4 + m.id) * 26;
        const perpY = (dx / dist) * Math.sin(this.clock * 4.4 + m.id) * 26;
        vx += perpX;
        vy += perpY;
      } else if (m.typeId === 'blade_hound') {
        // Flanks around player at medium range then pounces
        if (dist > 150 && dist < 360) {
          const flankAng = Math.atan2(dy, dx) + (m.id % 2 === 0 ? 0.65 : -0.65);
          vx = Math.cos(flankAng) * moveSpeed * 1.1;
          vy = Math.sin(flankAng) * moveSpeed * 1.1;
        }
      } else if (m.typeId === 'wild_boar' && !m.isElite) {
        // Angry sprint burst when close
        m.dashCd = (m.dashCd ?? 4.0) - dt;
        if (m.dashCd <= 0 && dist < 260) {
          m.burstTimer = 1.25;
          m.dashCd = 5.5;
        }
        if (m.burstTimer && m.burstTimer > 0) {
          m.burstTimer -= dt;
          const burst=1+.42*Math.sin(Math.PI*Math.min(1,Math.max(0,m.burstTimer/1.25)));
          vx *= burst;
          vy *= burst;
        }
      }

      if ((m.isBoss || m.isElite) && dist < 460) {
        m.dashCd = (m.dashCd ?? 3) - dt;
        if (m.dashCd <= 0) {
          m.dashCd = m.isBoss ? 4.8 : 7;
          this.dangers.push(...attackZones(this.chapterId, m, this.player, this.clock));
        }
      }

      const missile = WOOWL_MONSTERS[m.typeId]?.missile;
      if (missile && this.rangedAttack(m, missile, dx/dist, dy/dist, dist)) continue;
      if (dist > m.radius + 14) {
        this.terrain.move(m, vx*dt, vy*dt, monsterFootprint(m), m.id%2 ? 1 : -1);
      } else {
        meleeAttackers.push(m);
      }
    }

    this.dangers = this.dangers.filter(zone => {
      if (!this.monsters.some(m => m.id === zone.owner)) return false;
      if (zone.impact <= this.clock && zone.damage > 0) {
        const dist = Math.hypot(this.player.x-zone.x, this.player.y-zone.y);
        if (this.phase === 'battle' && dist <= zone.radius && dist >= zone.inner) this.hitPlayer(zone.damage);
        zone.damage = 0;
      }
      return this.clock < zone.impact + .23;
    });

    if (meleeAttackers.length > 0 && this.player.invulnerableTime <= 0) {
      const lead = meleeAttackers.reduce((best, cur) => (cur.damage > best.damage ? cur : best), meleeAttackers[0]);
      const swarmMult = 1 + Math.min(1.4, (meleeAttackers.length - 1) * 0.30);
      const hitChunk = Math.max(4, Math.round(lead.damage * 0.36 * swarmMult));
      this.hitPlayer(hitChunk, lead);
    }
  }

  private rangedAttack(m: MonsterEntity, kind: MissileKind, dx: number, dy: number, distance: number) {
    const profile = missiles[kind];
    if (m.aim) {
      const aim = m.aim;
      m.dir = calcDirection(aim.dx, aim.dy);
      if (this.clock >= aim.releaseAt) {
        const angle = Math.atan2(aim.dy, aim.dx);
        const spread = m.typeId === 'triple_serpent' ? [-.22, 0, .22] : [0];
        for (const offset of spread) {
          this.enemyShots.push({kind, x:m.x, y:m.y, dx:Math.cos(angle+offset), dy:Math.sin(angle+offset),
            remaining:310, damage:Math.max(4, Math.round(m.damage * .68))});
        }
        m.nextShotAt = this.clock + profile.cooldown + (m.id % 5) * .12;
        m.aim = undefined;
      }
      return true;
    }
    if (distance > 210) return false;
    if (this.clock >= (m.nextShotAt ?? 0)) {
      m.aim = {dx, dy, releaseAt:this.clock + profile.windup};
    }
    return true;
  }

  private advanceEnemyShots(dt: number) {
    this.enemyShots = this.enemyShots.filter(shot => {
      let travel = Math.min(shot.remaining, missiles[shot.kind].speed * dt);
      while (travel > 0) {
        const step = Math.min(6, travel);
        shot.x += shot.dx * step;
        shot.y += shot.dy * step;
        shot.remaining -= step;
        travel -= step;
        if (this.terrain.settle(shot, 3)) return false;
        if (Math.hypot(shot.x-this.player.x, shot.y-this.player.y) <= PLAYER_RADIUS + 4) {
          if (this.phase === 'battle') this.hitPlayer(shot.damage);
          return false;
        }
      }
      return shot.remaining > 0.001;
    });
  }

  private pickMonsterFromPool(progress: number): string {
    const chap = WOOWL_CHAPTERS[this.chapterId] || WOOWL_CHAPTERS.sunset_island;
    // The first minute belongs to the local opening pair; reinforcements then ramp in.
    const reinforcement = Math.max(0, Math.min(1, (progress - .1) / .25));
    const weightedPool = chap.monsterPool.map(item => ({
      typeId:item.typeId,
      weight:item.weight * (chap.opening.includes(item.typeId) ? 1 : reinforcement)
    })).filter(item => item.weight > 0);

    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * totalWeight;
    for (const item of weightedPool) {
      r -= item.weight;
      if (r <= 0) return item.typeId;
    }
    return weightedPool[0]?.typeId || 'scarecrow';
  }

  private spawnMonsterFromChapter(isElite = false, customDist?: number, fixedType?: string) {
    const chap = WOOWL_CHAPTERS[this.chapterId] || WOOWL_CHAPTERS.sunset_island;
    const curve = WOOWL_DIFFICULTY_CURVES[this.difficultyId] || WOOWL_DIFFICULTY_CURVES.standard;
    const bossTime = this.getBossTriggerTime();
    const state = evaluateCurveState(this.difficultyId, chap.chapterDifficulty, this.clock, bossTime);

    const angle = Math.random() * Math.PI * 2;
    const dist = customDist ?? (520 + Math.random() * 220);
    const edgeSafe = (position: number, offset: number, size: number) => {
      const value = position + offset;
      return value < 80 || value > size - 80 ? position - offset : value;
    };
    const x = edgeSafe(this.player.x, Math.cos(angle) * dist, WORLD_WIDTH);
    const y = Math.max(80, Math.min(WORLD_HEIGHT-80, edgeSafe(this.player.y, Math.sin(angle) * dist, WORLD_HEIGHT)));

    const pickedType = fixedType ?? this.pickMonsterFromPool(state.progress);
    const arch = WOOWL_MONSTERS[pickedType] || WOOWL_MONSTERS.scarecrow;

    const eliteHpMult = isElite ? 2.8 : 1.0;
    const eliteDmgMult = isElite ? 1.30 : 1.0;
    const eliteSpeedMult = isElite ? 1.10 : 1.0;

    const finalHp = Math.max(12, Math.round(arch.hp * state.hpMult * eliteHpMult));
    const finalDmg = Math.max(5, Math.round(arch.damage * state.dmgMult * eliteDmgMult));
    const finalSpeed = Math.round(arch.speed * state.speedMult * eliteSpeedMult);
    const finalExp = Math.max(1, Math.round((arch.exp * (isElite ? 4 : 1) + state.expBonusFlat) * curve.expMult));

    const spawn = {x,y};
    this.terrain.settle(spawn, monsterFootprint({radius:isElite ? Math.round(arch.radius*1.45) : arch.radius}));
    this.monsters.push({
      id: this.nextEntityId++,
      typeId: arch.id,
      name: isElite ? `【精英】${arch.name}` : arch.name,
      x:spawn.x,
      y:spawn.y,
      hp: finalHp * ENEMY_HEALTH_SCALE,
      maxHp: finalHp * ENEMY_HEALTH_SCALE,
      speed: finalSpeed,
      damage: finalDmg,
      exp: finalExp,
      radius: isElite ? Math.round(arch.radius * 1.45) : arch.radius,
      scale: isElite ? 1.7 : 1.0,
      isElite,
      spriteKey: arch.spriteKey
    });

    if (isElite) {
      this.addDamageNumber(x, y - 20, `【精英 ${arch.name} 来袭】`, '#c084fc', true);
      this.alertBanner = {
        type: 'elite',
        title: '精英来袭',
        subtitle: `${arch.name}`,
        duration: 3.5,
        maxDuration: 3.5,
        x,
        y
      };
      sound.playBossAlert();
    }
  }

  private spawnMilestoneElite(tier: 1 | 2 | 3) {
    const chap = WOOWL_CHAPTERS[this.chapterId] || WOOWL_CHAPTERS.sunset_island;
    const curve = WOOWL_DIFFICULTY_CURVES[this.difficultyId] || WOOWL_DIFFICULTY_CURVES.standard;

    const angle = Math.random() * Math.PI * 2;
    const dist = 540;
    const x = Math.max(120, Math.min(WORLD_WIDTH - 120, this.player.x + Math.cos(angle) * dist));
    const y = Math.max(120, Math.min(WORLD_HEIGHT - 120, this.player.y + Math.sin(angle) * dist));

    const {scale, baseHp, baseDmg, exp, radius} = MILESTONE_LORDS[tier - 1];
    const {name:species, spriteKey} = WOOWL_MONSTERS[chap.lordTypes[tier-1]];
    const name = species+'领主';

    const hp = ENEMY_HEALTH_SCALE * Math.round(baseHp * curve.hpMult * (1 + (chap.chapterDifficulty - 1) * 0.45));
    const dmg = Math.round(baseDmg * attackPressure(this.clock / this.getBossTriggerTime()) * curve.dmgMult * (1 + (chap.chapterDifficulty - 1) * 0.35));

    const spawn = {x,y};
    this.terrain.settle(spawn, monsterFootprint({radius:radius}));
    this.monsters.push({
      id: this.nextEntityId++,
      typeId: 'elite_milestone',
      name,
      x:spawn.x,
      y:spawn.y,
      hp,
      maxHp: hp,
      speed: Math.round(108 * curve.speedMult),
      damage: dmg,
      exp,
      radius,
      scale,
      isElite: true,
      dashCd: 4.5,
      spriteKey
    });

    this.addDamageNumber(x, y - 25, `【领主降临】${name}`, '#ff4400', true);
    this.alertBanner = {
      type: 'elite',
      title: '领主来袭',
      subtitle: `${name}`,
      duration: 5.0,
      maxDuration: 5.0,
      x,
      y
    };
    sound.playBossAlert();
  }

  private spawnBoss() {
    this.bossSpawned = true;
    const chap = WOOWL_CHAPTERS[this.chapterId] || WOOWL_CHAPTERS.sunset_island;
    const curve = WOOWL_DIFFICULTY_CURVES[this.difficultyId] || WOOWL_DIFFICULTY_CURVES.standard;

    const angle = Math.random() * Math.PI * 2;
    const x = Math.max(140, Math.min(WORLD_WIDTH - 140, this.player.x + Math.cos(angle) * 480));
    const y = Math.max(140, Math.min(WORLD_HEIGHT - 140, this.player.y + Math.sin(angle) * 480));

    const hp = ENEMY_HEALTH_SCALE * Math.round(chap.bossHp * curve.bossHpMult);
    const dmg = Math.round(chap.bossDamage * curve.bossDmgMult * attackPressure(1));

    const spawn = {x,y};
    this.terrain.settle(spawn, monsterFootprint({radius:76}));
    this.monsters.push({
      id: this.nextEntityId++,
      typeId: 'boss',
      name: chap.bossName,
      x:spawn.x,
      y:spawn.y,
      hp,
      maxHp: hp,
      speed: Math.round(122 * curve.speedMult),
      damage: dmg,
      exp: 1000,
      radius: 76,
      scale: 2.85,
      isBoss: true,
      isSuperBoss: true,
      dashCd: 4.0,
      spriteKey: chap.bossSpriteKey || '20082'
    });

    this.alertBanner = {
      type: 'boss',
      title: '首领现身',
      subtitle: `${chap.bossName}`,
      duration: 6.5,
      maxDuration: 6.5,
      x,
      y
    };
    sound.playBossAlert();
    sound.playBgm('boss');

    this.addDamageNumber(x, y, `【灭世魔主 · ${chap.bossName} 降临！】`, '#ff0033', true);
  }

  private updateMonsterStatuses(dt: number) {
    this.statusTickTimer += dt;
    if (this.statusTickTimer < 0.5) return;
    const tickSec = this.statusTickTimer;
    this.statusTickTimer = 0;

    for (const m of [...this.monsters]) {
      if (m.hp <= 0) continue;
      let dotDmg = 0;
      let dotColor = '#44ff88';

      if (m.poisonUntil && this.clock < m.poisonUntil && m.poisonDps) {
        dotDmg += Math.round(m.poisonDps * tickSec);
      }
      if (m.burnUntil && this.clock < m.burnUntil && m.burnDps) {
        dotDmg += Math.round(m.burnDps * tickSec);
        dotColor = '#ff7722';
      }

      if (dotDmg > 0) {
        m.hp -= dotDmg;
        this.addDamageNumber(m.x, m.y - 8, `${dotDmg}`, dotColor, false);
        if (m.hp <= 0) {
          this.killEnemy(m);
        }
      }
    }
  }

  private hitPlayer(dmg: number, attacker?: MonsterEntity) {
    if (this.player.invulnerableTime > 0) return;

    let finalDmg = dmg * (1 - this.equipment.armor * 0.075);
    if (this.clock < this.player.shieldUntil) {
      finalDmg *= (1 - this.shieldReduction);
    }

    const rounded = Math.max(1, Math.round(finalDmg));
    this.player.hp -= rounded;
    this.player.invulnerableTime = 0.48;
    sound.play('player_hurt', 0.4);
    this.addDamageNumber(this.player.x, this.player.y - 24, `-${rounded}`, '#ff4d4f', true);

    if (attacker && attacker.hp > 0 && this.clock < this.player.shieldUntil && this.thornRatio > 0) {
      const reflected = Math.max(2, Math.round(rounded * this.thornRatio * 2.2));
      this.damageEnemy(attacker, reflected, false);
    }

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.phase = 'game_over';
      sound.play('player_die');
      sound.stopBgm();
    }
  }

  damageEnemy(m: MonsterEntity, dmg: number, crit = false) {
    if (m.hp <= 0) return;
    const armorMult = 1 + (m.armorBreak || 0);
    const finalDmg = Math.max(1, Math.round(dmg * armorMult));

    m.hp -= finalDmg;
    this.addDamageNumber(m.x, m.y, `${finalDmg}`, crit ? '#ffdd00' : '#ffffff', crit);
    sound.play('monster_hurt', 0.25);

    if (m.hp <= 0) {
      this.killEnemy(m);
    }
  }

  private killEnemy(m: MonsterEntity) {
    this.monsters = this.monsters.filter(e => e.id !== m.id);
    const firstDrop = this.drops.length;
    this.player.kills++;
    if (!m.isBoss && (m.isElite || Math.random() < 0.018)) {
      const slot = Math.random() < .5 ? 'weapon' : 'armor';
      const rank = Math.min(4, 1 + Math.floor(this.clock / 165) + (m.typeId === 'elite_milestone' ? 1 : 0));
      this.drops.push({id: this.nextEntityId++, type: 'gear', slot, value: rank, x: m.x, y: m.y});
    }
    sound.play('monster_die', 0.3);

    const tier: 1 | 2 | 3 = m.exp < 6 ? 1 : (m.exp < 20 ? 2 : 3);
    this.drops.push({
      id: this.nextEntityId++,
      type: 'exp',
      x: m.x,
      y: m.y,
      value: m.exp,
      tier
    });

    if (m.isBoss) {
      this.player.gold += 800;
      this.bossDefeated = true;
      this.phase = 'victory';
      sound.playBgm('menu');
    } else if (m.isElite) {
      // Elite drops 3 gold coin piles + potion
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        this.drops.push({
          id: this.nextEntityId++,
          type: 'gold',
          x: m.x + Math.cos(a) * 35,
          y: m.y + Math.sin(a) * 35,
          value: 35,
          tier: 2
        });
      }
      this.drops.push({
        id: this.nextEntityId++,
        type: 'potion',
        x: m.x,
        y: m.y - 20,
        value: 50
      });
    } else if (Math.random() < 0.16) {
      const isPotion = Math.random() < 0.35;
      this.drops.push({
        id: this.nextEntityId++,
        type: isPotion ? 'potion' : 'gold',
        x: m.x + (Math.random() - 0.5) * 20,
        y: m.y + (Math.random() - 0.5) * 20,
        value: isPotion ? 28 : 10,
        tier: 1
      });
    }
    for (let i=firstDrop;i<this.drops.length;i++) this.terrain.settle(this.drops[i],5);
  }

  private updateDrops(dt: number) {
    let coinCount=0, coinTier=1;
    const pickupDist = this.player.pickupRange;
    if (this.drops.length > 320 && Math.floor(this.clock)!==Math.floor(this.clock-dt)) {
      const piles = new Map<string, DropEntity>();
      this.drops = this.drops.filter(d => {
        if ((d.type !== 'exp' && d.type !== 'gold') || Math.hypot(this.player.x-d.x,this.player.y-d.y)<pickupDist+64) return true;
        const cell = d.type + ':' + Math.floor(d.x/96) + ':' + Math.floor(d.y/96);
        const pile = piles.get(cell);
        if (!pile) { piles.set(cell,d); return true; }
        pile.value += d.value;
        pile.tier = pile.value>=20 ? 3 : 2;
        return false;
      });
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y);

      if (dist <= pickupDist) {
        const angle = Math.atan2(this.player.y - d.y, this.player.x - d.x);
        const flySpeed = 480;
        d.x += Math.cos(angle) * flySpeed * dt;
        d.y += Math.sin(angle) * flySpeed * dt;

        if (dist <= 32 || dist <= flySpeed * dt) {
          if (d.type === 'exp') {
            this.gainExp(d.value);
            coinCount++;
            coinTier=Math.max(coinTier,d.tier || 1);
          } else if (d.type === 'gold') {
            this.player.gold += d.value;
            coinCount++;
            coinTier=Math.max(coinTier,d.tier || 1);
          } else if (d.type === 'gear' && d.slot) {
            const info = gearInfo(this.heroClass, d.slot, d.value);
            if (d.value > this.equipment[d.slot]) {
              this.equipment[d.slot] = d.value;
              this.applyPassiveEffects();
              this.addDamageNumber(this.player.x, this.player.y, info.title, '#ffcf82', true);
            } else {
              const value = d.value * 18;
              this.player.gold += value;
              this.addDamageNumber(this.player.x, this.player.y, '售 +' + value, '#e6c57c');
            }
            coinCount++;
            coinTier=Math.max(coinTier,2);
          } else if (d.type === 'potion') {
            const healAmt = d.value || 40;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
            sound.playPotionPickup();
            this.addDamageNumber(this.player.x, this.player.y, `+${healAmt} 气血`, '#44ff44');
          }
          this.drops.splice(i, 1);
          if (this.phase !== 'battle') break;
        }
      }
    }
    if (coinCount) sound.playCoinPickup(coinTier,coinCount);
  }

  gainExp(amount: number) {
    this.player.exp += amount;
    if (this.player.exp >= this.player.maxExp) {
      this.player.exp -= this.player.maxExp;
      this.player.level++;
      this.player.maxExp = Math.round(this.player.maxExp + 9 + this.player.level * 3.8);
      this.player.maxHp += 15;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.16));
      this.player.invulnerableTime = Math.max(this.player.invulnerableTime, 0.85);

      // Protective knockback ring on level up
      for (const m of this.monsters) {
        const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
        if (d < 130 && d > 0) {
          const ang = Math.atan2(m.y - this.player.y, m.x - this.player.x);
          const push = m.isBoss ? 35 : 105;
          this.terrain.move(m, Math.cos(ang) * push, Math.sin(ang) * push, monsterFootprint(m));
        }
      }

      sound.play('skill_holyword');
      this.addDamageNumber(this.player.x, this.player.y, '升级', '#ffe066', true);
      this.effects.push({
        id: this.nextEntityId++,
        type: 'level_up',
        x: this.player.x,
        y: this.player.y
      });
      this.triggerLevelUp();
    }
  }

  private triggerLevelUp() {
    this.phase = 'level_up';
    this.upgradeChoices = this.generateUpgradeChoices();
    if (!this.upgradeChoices.length) {
      this.player.gold += 60;
      this.phase = 'battle';
    }
  }

  rerollChoices() {
    if (this.phase!=='level_up' || this.rerolls<=0) return false;
    const previous=new Set(this.upgradeChoices.map(c=>c.id));
    const next=this.generateUpgradeChoices(previous);
    if (!next.some(c=>!previous.has(c.id))) return false;
    this.rerolls--;
    this.upgradeChoices=next;
    sound.play('ui_click');
    this.emit();
    return true;
  }

  keepLoadout() {
    if (this.phase!=='level_up' || !this.upgradeChoices.every(c=>c.swap) || !this.upgradeChoices.length) return;
    this.player.gold+=60;
    this.upgradeChoices=[];
    this.phase='battle';
    this.emit();
  }

  private generateUpgradeChoices(previous=new Set<string>()) {
    const choices: Array<{
      item: GameEngine['upgradeChoices'][0];
      weight: number;
    }> = [];
    const playerLvl = this.player.level;

    const getQualityWeight = (quality: SkillQuality = 'common', lvl: number): number => {
      switch (quality) {
        case 'common': return lvl <= 4 ? 90 : (lvl <= 8 ? 40 : 15);
        case 'rare': return lvl <= 3 ? 55 : (lvl <= 8 ? 85 : 45);
        case 'epic': return lvl < 4 ? 10 : (lvl <= 8 ? 75 : 70);
        case 'mythic': return lvl < 6 ? 0 : (lvl <= 10 ? 45 : 75);
        case 'legendary': return lvl < 9 ? 0 : (lvl <= 12 ? 35 : 70);
        default: return 50;
      }
    };

    // Active skills upgrade
    for (const act of this.activeSkills) {
      const def = WOOWL_SKILLS[act.id];
      if (def && act.level < def.maxLevel) {
        if (act.level === 4 && this.clock < AWAKENING_TIME) continue;
        const nextUpgrade = def.upgrades.find(u => u.level === act.level + 1);
        const w = getQualityWeight(def.quality, playerLvl) * (act.level===4 ? 2.7 : 1.35);
        choices.push({
          item: {
            type: 'skill',
            id: act.id,
            isNew: false,
            level: act.level + 1,
            title: act.level+1===5 ? def.name+' · 觉醒「'+nextUpgrade?.title+'」' : choiceTitle(def.name,act.level+1,false),
            description: nextUpgrade?.description ?? def.desc,
            iconId: def.iconId,
            quality: def.quality
          },
          weight: w
        });
      }
    }

    const selected: typeof this.upgradeChoices = [];
    const full=this.activeSkills.length>=5;
    const swapOptions: typeof selected = [];
    for (const skill of this.availableReplacements()) {
      const weight=getQualityWeight(skill.quality,playerLvl);
      if (!weight) continue;
      const item: typeof selected[number]={type:'skill',id:skill.id,isNew:true,level:1,
        title:choiceTitle(skill.name,1,true),description:skill.desc,iconId:skill.iconId,quality:skill.quality};
      if (!full) choices.push({item,weight});
      else if (playerLvl%SWAP_INTERVAL===0 && (skill.quality==='mythic' || skill.quality==='legendary')) {
        swapOptions.push({...item,swap:true});
      }
    }
    if (swapOptions.length) {
      const unseen=swapOptions.filter(c=>!previous.has(c.id));
      const pool=unseen.length ? unseen : swapOptions;
      selected.push(pool[Math.floor(Math.random()*pool.length)]);
    }

    // Passives
    const allPassives = Object.values(WOOWL_PASSIVES);
    for (const p of allPassives) {
      const existing = this.activePassives.find(a => a.id === p.id);
      const curLevel = existing ? existing.level : 0;
      if (curLevel < p.maxLevel) {
        choices.push({
          item: {
            type: 'passive',
            id: p.id,
            isNew: curLevel === 0,
            level: curLevel + 1,
            title: choiceTitle(p.name, curLevel + 1, !existing),
            description: p.desc,
            iconId: p.iconId
          },
          weight: 45
        });
      }
    }

    // Weighted selection of 3 unique choices
    const pool = [...choices];

    while (selected.length < 3 && pool.length > 0) {
      const unseen = pool.filter(c=>!previous.has(c.item.id));
      const candidates = unseen.length ? unseen : pool;
      const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
      let rand = Math.random() * totalWeight;
      let pickedIdx = 0;
      for (let i = 0; i < candidates.length; i++) {
        rand -= candidates[i].weight;
        if (rand <= 0) {
          pickedIdx = i;
          break;
        }
      }
      const picked=candidates[pickedIdx];
      selected.push(picked.item);
      pool.splice(pool.indexOf(picked), 1);
    }

    return selected;
  }

  selectUpgrade(choice: GameEngine['upgradeChoices'][0], oldSkill?:string) {
    if (this.phase !== 'level_up' || !this.upgradeChoices.includes(choice)) return;
    const slot=this.activeSkills.findIndex(s=>s.id===oldSkill);
    if (choice.swap && (slot<0 || this.activeSkills.length!==5 || !this.availableReplacements().some(s=>s.id===choice.id))) return;
    if (!choice.swap && choice.type==='skill' && choice.isNew && this.activeSkills.length>=5) return;
    sound.play('ui_click');

    if (choice.type === 'skill') {
      const existing = this.activeSkills.find(s => s.id === choice.id);
      if (existing) {
        existing.level = choice.level;
      } else if (choice.swap) {
        this.removeSkillEffects(this.activeSkills[slot].id);
        this.activeSkills[slot]={id:choice.id,level:1,cdTimer:0,maxCd:WOOWL_SKILLS[choice.id].cooldown};
      } else {
        this.activeSkills.push({
          id: choice.id,
          level: choice.level,
          cdTimer: 0,
          maxCd: WOOWL_SKILLS[choice.id]?.cooldown || 2.0
        });
      }
    } else {
      const existing = this.activePassives.find(p => p.id === choice.id);
      if (existing) {
        existing.level = choice.level;
      } else {
        this.activePassives.push({ id: choice.id, level: choice.level });
      }
      this.applyPassiveEffects();
    }

    this.upgradeChoices = [];
    this.phase = 'battle';
    this.emit();
  }

  private applyPassiveEffects() {
    const chapDiff = WOOWL_CHAPTERS[this.chapterId]?.chapterDifficulty || 1.0;
    this.player.damageBonus = (chapDiff - 1) * 0.30 + this.equipment.weapon * .19 + this.training.might * .04;
    this.player.speed = this.heroClass === 'warrior' ? 225 : this.heroClass === 'wizard' ? 212 : 218;
    this.player.cooldownBonus = 0;
    this.player.areaBonus = 0;
    this.player.pickupRange = 135 + this.training.fortune * 8;
    this.player.hpRegen = 0.5;

    const baseHp = (this.heroClass === 'warrior' ? 240 : this.heroClass === 'wizard' ? 155 : 190) + Math.round((chapDiff - 1) * 30) + this.training.vitality * 15;
    let hpModTotal = 0;

    for (const p of this.activePassives) {
      const def = WOOWL_PASSIVES[p.id];
      if (!def) continue;
      const lvl = p.level;

      if (def.effect.damageMod) this.player.damageBonus += def.effect.damageMod * lvl;
      if (def.effect.speedMod) this.player.speed *= (1 + def.effect.speedMod * lvl);
      if (def.effect.cooldownMod) this.player.cooldownBonus += def.effect.cooldownMod * lvl;
      if (def.effect.areaMod) this.player.areaBonus += def.effect.areaMod * lvl;
      if (def.effect.pickupRangeMod) this.player.pickupRange *= (1 + def.effect.pickupRangeMod * lvl);
      if (def.effect.hpRegen) this.player.hpRegen += def.effect.hpRegen * lvl;
      if (def.effect.hpMod) hpModTotal += def.effect.hpMod * lvl;
    }

    const expectedMaxHp = Math.round((baseHp + (this.player.level - 1) * 15) * (1 + hpModTotal));
    if (expectedMaxHp > this.player.maxHp) {
      const delta = expectedMaxHp - this.player.maxHp;
      this.player.maxHp = expectedMaxHp;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + delta);
    }
  }

  private addDamageNumber(x: number, y: number, text: string, color: string, crit = false) {
    if (this.damageNumbers.length >= 36) this.damageNumbers.shift();
    this.damageNumbers.push({
      id: this.nextEntityId++,
      x,
      y: y - 10,
      text,
      color,
      crit,
      life: 0.75
    });
  }

  private updateDamageNumbers(dt: number) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y -= 38 * dt;
      d.life -= dt;
      if (d.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private findNearestEnemy(x: number, y: number, maxRange: number): MonsterEntity | null {
    let bestDist = maxRange;
    let bestEnemy: MonsterEntity | null = null;
    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= bestDist) {
        bestDist = d;
        bestEnemy = m;
      }
    }
    return bestEnemy;
  }

  private findNearestEnemies(x: number, y: number, maxRange: number, count: number): MonsterEntity[] {
    return this.monsters
      .filter(m => m.hp > 0)
      .map(m => ({ m, dist: Math.hypot(m.x - x, m.y - y) }))
      .filter(item => item.dist <= maxRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, count)
      .map(item => item.m);
  }
}

export const game = new GameEngine();
