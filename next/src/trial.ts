import type { GameEngine } from './game';
import { WOOWL_SKILLS as skills } from './config/skills';
import { monsterFootprint, PLAYER_RADIUS } from './terrain';

export type TrialId='guard'|'tower';
export function trialFrom(search:string):TrialId|null {
  const value=new URLSearchParams(search).get('trial');
  return value==='guard'||value==='tower' ? value : null;
}
export const trialId=trialFrom(globalThis.location?.search??'');
export const trials={
  guard:{chapter:'central_state',role:'warrior',name:'中州 · 屋角试刀',tip:'看清铁甲刀卫的冲锋带，从屋角向侧面让开。',skills:['moon_blade','assassination_sword','diamond_body']},
  tower:{chapter:'heaven_tower',role:'wizard',name:'通天塔 · 双环天火',tip:'先避开脚下的火光，再移进外环中央的空地。',skills:['fireball','lightning_strike','wind_shield']}
} as const;

// Build an in-memory encounter using the same save/restore and boss director as a run.
export function prepareTrial(engine:GameEngine,id:TrialId) {
  const spec=trials[id];
  const state=engine.snapshot();
  const house=engine.terrain.props.find(prop=>prop.kind==='ancient_pavilion');
  const start=id==='guard' && house
    ? {x:house.x+house.rx*.8,y:house.y+house.ry+35}
    : {x:1280,y:720};
  engine.terrain.settle(start,PLAYER_RADIUS);
  state.clock=598;state.waveTimer=598;state.milestones=[150,300,450];
  state.lastDraftAt=598;state.nextRangedWaveAt=615;state.respiteUntil=612;state.monsters=[];
  state.player={...state.player,...start,level:21,hp:525,maxHp:525,exp:0,maxExp:1050,gold:200};
  state.activeSkills=spec.skills.map((id,index)=>({id,level:index===0?5:3,cdTimer:.8,maxCd:skills[id].cooldown}));
  engine.restore(state);engine.phase='battle';engine.emit();
  const detach=engine.subscribe(()=>{
    const boss=engine.getActiveBoss();
    if(!boss)return;
    detach();
    // Face the same corner every visit. After this the normal AI owns all movement and casts.
    boss.x=start.x+(id==='guard'?85:-74);boss.y=start.y-(id==='guard'?120:135);
    engine.terrain.settle(boss,monsterFootprint(boss));
    boss.bossStep=id==='guard'?2:0;
    boss.dashCd=.9;
    if(engine.alertBanner){engine.alertBanner.x=boss.x;engine.alertBanner.y=boss.y;}
  });
  return detach;
}
