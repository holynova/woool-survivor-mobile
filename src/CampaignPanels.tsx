import { useState } from 'react';
import { game } from './game';
import { WOOWL_SKILLS as skills, WOOWL_PASSIVES as passives } from './config/skills';
import { WOOWL_CHAPTERS as chapters } from './config/chapters';
import { AWAKENING_TIME, WOOWL_DIFFICULTY_CURVES as curves } from './config/curves';
import { disciplines, gearInfo, trainingCost, type Training } from './config/equipment';
import type { Journal } from './journal';

export const time = (s:number) => Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
export const media = (folder:string,file:string|number) => './assets/woool/'+folder+'/'+file+'.png';
const jobs = {warrior:'战士',wizard:'法师',taoist:'道士'};
export function Head({title,close}:{title:string;close:()=>void}) {
  return <div className="panel-head"><h2>{title}</h2><button aria-label="关闭" onClick={close}>×</button></div>;
}
export function Records({journal}:{journal:Journal}) {
  return <><p>通关 {journal.cleared.length} / {Object.keys(chapters).length} 章 · 库银 {journal.bank}</p>
    {!journal.recent.length && <p>暂无战绩</p>}
    {journal.recent.map(r=><div className="entry" key={r.id}><b>{chapters[r.chapter]?.name.split(' · ')[0]} · {{victory:'通关',game_over:'阵亡',retired:'撤离'}[r.outcome]}</b>
      <small>{jobs[r.role]} · {curves[r.difficulty]?.name} · {time(r.seconds)} · {r.kills} 斩 · 入库 {r.coins}</small></div>)}
    <p><a className="source-link" href="https://github.com/holynova/woool-survivor-mobile" target="_blank" rel="noreferrer">GitHub · v1.0.4</a></p></>;
}
export function TrainingPanel({journal,buy}:{journal:Journal;buy:(id:keyof Training)=>void}) {
  return <><p>库银 {journal.bank} · 下局生效</p>
    {(Object.keys(disciplines) as (keyof Training)[]).map(id=>{
      const rank=journal.training[id], cost=trainingCost(rank);
      return <div className="entry split" key={id}><span><b>{disciplines[id].name} · {rank}/5 重</b><small>{disciplines[id].description}</small></span>
        <button disabled={rank>=5||journal.bank<cost} onClick={()=>buy(id)}>{rank>=5?'已圆满':cost+' 金'}</button></div>;
    })}</>;
}
export function Loadout({changed}:{changed:()=>void}) {
  const [selected,select]=useState<string|null>(null);
  const change=(replacement?:string)=>{
    if(selected && game.changeSkill(selected,replacement)){select(null);changed();}
  };
  if(selected) return <><p>{skills[selected].name} · 替换后为 1 级 · {game.player.gold} 金</p>
    {game.availableReplacements().map(s=><button key={s.id} className="row" disabled={game.player.gold<80} onClick={()=>change(s.id)}>
      <img src={media('skills',s.iconId)} alt=""/><span><b>{s.name}</b><small>替换 · 80 金</small></span></button>)}
    <div className="actions"><button onClick={()=>select(null)}>返回</button>
      <button disabled={game.activeSkills.length<=1} onClick={()=>change()}>卸下{skills[selected].name}</button></div></>;
  return <><small>装备 · 高品自动穿戴，其余售出</small>
    <div className="gear-grid">{(['weapon','armor'] as const).map(slot=>{
      const rank=game.equipment[slot], item=gearInfo(game.heroClass,slot,rank);
      return <div key={slot}><img src={media('items',item.icon)} alt=""/><span>{item.title}<small>{slot==='weapon'?'伤害 +'+rank*19+'%':'减伤 '+rank*7.5+'%'}</small></span></div>;
    })}</div>
    <small>技能 · {game.activeSkills.length}/5</small>
    {game.activeSkills.map(s=><button className="row" key={s.id} onClick={()=>select(s.id)}><img src={media('skills',skills[s.id].iconId)} alt=""/><span><b>{skills[s.id].name} · {s.level}/5</b><small>{s.level===5 ? '已觉醒' : game.clock<AWAKENING_TIME ? time(AWAKENING_TIME)+' 开放觉醒' : '五级觉醒'} · {skills[s.id].upgrades[4].title}</small></span><span className="tail">调整 ›</span></button>)}
    {!!game.activePassives.length&&<p>{game.activePassives.map(p=>passives[p.id].name+' '+p.level+'级').join(' · ')}</p>}</>;
}
