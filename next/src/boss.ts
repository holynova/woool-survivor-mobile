import type {MonsterEntity} from './types';
import type {MissileKind} from './ranged';
import {monsterFootprint, WORLD_HEIGHT, WORLD_WIDTH, type Terrain} from './terrain';

type BossKit = {
  signature: string;
  volley: string;
  missile: MissileKind;
  spread: number;
  special: string;
  minion?: string;
};

export const bossKits: Record<string,BossKit> = {
  sunset_island: {signature:'白骨震地',volley:'碎骨飞刺',missile:'thorn',spread:.24,special:'尸王冲撞'},
  central_state: {signature:'五步裂地',volley:'穿甲刀雨',missile:'arrow',spread:.17,special:'铁甲突进'},
  hot_desert: {signature:'环形沙震',volley:'流沙飞刺',missile:'thorn',spread:.30,special:'赤鬃奔袭'},
  deadwater_marsh: {signature:'连环毒沼',volley:'碧鳞毒涎',missile:'venom',spread:.25,special:'沼泽唤卫',minion:'marsh_fisher'},
  frozen_citadel: {signature:'双重冰爆',volley:'霜角冰锥',missile:'frost',spread:.20,special:'踏雪冲锋'},
  iron_citadel: {signature:'十字熔爆',volley:'炼狱火矢',missile:'ember',spread:.26,special:'魔军号令',minion:'demon_axeman'},
  serpent_valley: {signature:'三首毒息',volley:'蛇牙齐射',missile:'venom',spread:.28,special:'群蛇出穴',minion:'red_serpent'},
  heaven_tower: {signature:'双环天火',volley:'九霄魂火',missile:'spirit',spread:.22,special:'招魂敕令',minion:'soul_envoy'}
};

type Point = {x:number;y:number};
export type BossCast =
  | {kind:'ground'; name:string; releaseAt:number}
  | {kind:'volley'; name:string; releaseAt:number; angle:number; count:number}
  | {kind:'summon'; name:string; releaseAt:number; points:Point[]; species:string}
  | {kind:'charge'; name:string; releaseAt:number; from:Point; to:Point; hit:boolean};

export const CHARGE_RADIUS = 28;
export const CHARGE_TIME = .52;
export const enraged = (boss:MonsterEntity) => boss.hp <= boss.maxHp * .5;

export function planBossCast(chapter:string, boss:MonsterEntity, player:Point, terrain:Terrain, clock:number, summonSlots=2): BossCast {
  const kit = bossKits[chapter];
  const step = (boss.bossStep ?? 0) % 3;
  const angle = Math.atan2(player.y-boss.y,player.x-boss.x);
  if (step === 0) return {kind:'ground', name:kit.signature, releaseAt:clock+1};
  if (step === 1 || (kit.minion && summonSlots===0)) return {kind:'volley', name:kit.volley, releaseAt:clock+1.05, angle, count:enraged(boss)?5:3};
  if (kit.minion) {
    const points = [-1,1].slice(0,summonSlots).map(side=>{
      const x=boss.x+Math.cos(angle+side*Math.PI/2)*78, y=boss.y+Math.sin(angle+side*Math.PI/2)*78;
      const p={x:Math.max(80,Math.min(WORLD_WIDTH-80,x)),y:Math.max(80,Math.min(WORLD_HEIGHT-80,y))};
      terrain.settle(p,14);
      return p;
    });
    return {kind:'summon',name:kit.special,releaseAt:clock+1.25,points,species:kit.minion};
  }
  return planCharge(boss,player,terrain,clock,kit.special);
}

export function planCharge(boss:MonsterEntity,player:Point,terrain:Terrain,clock:number,name:string,reachLimit=260):BossCast {
  const angle=Math.atan2(player.y-boss.y,player.x-boss.x);
  // Clip the locked lane to solid scenery before displaying it.
  const from={x:boss.x,y:boss.y}, to={...from};
  const reach=Math.min(reachLimit,Math.hypot(player.x-boss.x,player.y-boss.y)+55);
  for(let d=5;d<=reach;d+=5){
    const p={x:from.x+Math.cos(angle)*d,y:from.y+Math.sin(angle)*d};
    if(p.x<70 || p.x>WORLD_WIDTH-70 || p.y<70 || p.y>WORLD_HEIGHT-70 || terrain.settle(p,monsterFootprint(boss))) break;
    Object.assign(to,p);
  }
  return {kind:'charge', name, releaseAt:clock+1.1, from,to,hit:false};
}

export function stunMonster(m:MonsterEntity,clock:number,duration:number) {
  if (m.isBoss) {
    if(clock < (m.stunGuardUntil ?? 0)) return;
    duration = Math.min(.45,duration*.25);
    m.stunGuardUntil = clock+duration+1.8;
  }
  m.stunUntil=Math.max(m.stunUntil??0,clock+duration);
}

export function slowMonster(m:MonsterEntity,clock:number,duration:number) {
  m.slowUntil=Math.max(m.slowUntil??0,clock+duration*(m.isBoss ? .4 : 1));
}
