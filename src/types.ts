export type HeroClass = 'warrior' | 'wizard' | 'taoist';

export type GamePhase = 'lobby' | 'paused' | 'battle' | 'level_up' | 'game_over' | 'victory';

export type DifficultyCurveId = 'casual' | 'standard' | 'surge' | 'hell';

export type SkillQuality = 'common' | 'rare' | 'epic' | 'mythic' | 'legendary';

export interface SkillDefinition {
  id: string;
  name: string;
  classType: HeroClass | 'all';
  iconId: number; // e.g. 2010 for 狂龙紫电
  quality: SkillQuality;
  desc: string;
  cooldown: number; // in seconds
  damage: number;
  area: number;
  range: number;
  duration?: number;
  soundKey: string;
  maxLevel: number;
  upgrades: {
    level: number;
    title: string;
    description: string;
  }[];
}

export interface PassiveDefinition {
  id: string;
  name: string;
  iconId: number;
  iconType?: 'skill' | 'item';
  desc: string;
  maxLevel: number;
  effect: {
    damageMod?: number;
    speedMod?: number;
    hpMod?: number;
    cooldownMod?: number;
    areaMod?: number;
    pickupRangeMod?: number;
    hpRegen?: number;
  };
}

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  exp: number;
  maxExp: number;
  speed: number;
  gold: number;
  kills: number;
  dir: number; // 0-7
  moving: boolean;
  damageBonus: number;
  cooldownBonus: number;
  areaBonus: number;
  pickupRange: number;
  hpRegen: number;
  invulnerableTime: number;
  shieldUntil: number;
}

export interface ActiveSkillState {
  id: string;
  level: number;
  cdTimer: number;
  maxCd?: number;
}

export interface ActivePassiveState {
  id: string;
  level: number;
}

export interface MonsterEntity {
  aim?: { dx:number; dy:number; releaseAt:number };
  nextShotAt?: number;
  id: number;
  typeId: string;
  name: string;
  x: number;
  y: number;
  dir?: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  exp: number;
  radius: number;
  scale?: number;
  isBoss?: boolean;
  isElite?: boolean;
  isSuperBoss?: boolean;
  color?: number;
  animKey?: string;
  spriteKey?: string;
  slowUntil?: number;
  stunUntil?: number;
  poisonUntil?: number;
  poisonDps?: number;
  burnUntil?: number;
  burnDps?: number;
  armorBreak?: number;
  dashCd?: number;
  burstTimer?: number;
}

export interface MinionEntity {
  id: number;
  type: 'skeleton' | 'enhanced_skeleton' | 'shinsu';
  name: string;
  x: number;
  y: number;
  dir?: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  targetEnemyId: number | null;
  attackCd: number;
}

export interface DropEntity {
  id: number;
  type: 'exp' | 'gold' | 'potion' | 'gear';
  x: number;
  y: number;
  value: number;
  tier?: 1 | 2 | 3;
  slot?: 'weapon' | 'armor';
}

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  crit?: boolean;
  life: number;
}

export type FlightKind = 'fireball' | 'talisman' | 'ghost_fire_curse' | 'meteor' | 'shinsu_hit';
export interface Flight {
  id:number; kind:FlightKind; x:number; y:number; targetX:number; targetY:number;
  targetId?:number; damage:number; level:number; radius:number; launchAt:number;
}

export interface EffectEvent {
  impact?:boolean;
  id: number;
  type:
    | 'lightning'
    | 'blade_arc'
    | 'talisman'
    | 'meteor'
    | 'hell_thunder'
    | 'poison'
    | 'fire_slash'
    | 'level_up'
    | 'shield'
    | 'dash'
    | 'diamond_body'
    | 'wind_shield'
    | 'shinsu'
    | 'shinsu_hit'
    | 'enhanced_skeleton'
    | 'skeleton_hit'
    | 'ice_roar'
    | 'fireball'
    | 'lightning_strike'
    | 'hellfire'
    | 'attack_slash'
    | 'assassination_sword'
    | 'thunder_sword'
    | 'heal_spell'
    | 'summon_skeleton'
    | 'lion_roar'
    | 'ghost_fire_curse';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  dir?: number;
  radius?: number;
  color?: number;
  level?: number;
}

export interface MonsterArchetype {
  missile?: import('./ranged').MissileKind;
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  exp: number;
  radius: number;
  spriteKey: string;
}

export interface DifficultyCurveDefinition {
  id: DifficultyCurveId;
  name: string;
  badge: string;
  summary: string;
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  densityMult: number;
  expMult: number;
  cdMult: number;
  eliteInterval: number;
  bossTimeScale: number;
  bossHpMult: number;
  bossDmgMult: number;
}

export interface AlertBanner {
  type: 'elite' | 'boss';
  title: string;
  subtitle: string;
  duration: number;
  maxDuration: number;
  x?: number;
  y?: number;
}

export interface ChapterDefinition {
  id: string;
  name: string;
  subtitle: string;
  bgImage: string;
  bossName: string;
  bossSpriteKey: string;
  bossHp: number;
  bossDamage: number;
  chapterDifficulty: number;
  targetKills: number;
  durationSeconds: number;
  description: string;
  ambientTheme: 'peach' | 'embers' | 'sand' | 'wisp' | 'frost' | 'lava';
  rangedType: string;
  opening: [string, string];
  lordTypes: [string, string, string];
  monsterPool: {
    typeId: string;
    weight: number;
  }[];
}
