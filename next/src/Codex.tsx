import { useEffect, useRef, useState } from 'react';
import { WOOWL_SKILLS, WOOWL_PASSIVES } from './config/skills';
import { bestiary, type MonsterEntry } from './config/bestiary';
import type { HeroClass, SkillDefinition, PassiveDefinition } from './types';
import { media } from './CampaignPanels';
import { assetUrl } from './utils';
import './codex.css';

const classes = {warrior:'战士',wizard:'法师',taoist:'道士',all:'通用'};
const art = (name:string) => assetUrl('assets/woool/codex/'+name+'.webp');
type Entry =
  | {kind:'skill'; data:SkillDefinition}
  | {kind:'passive'; data:PassiveDefinition}
  | {kind:'monster'; data:MonsterEntry};

const skills: Entry[] = Object.values(WOOWL_SKILLS).map(data => ({kind:'skill',data}));
const passives: Entry[] = Object.values(WOOWL_PASSIVES).map(data => ({kind:'passive',data}));
const monsters: Entry[] = bestiary.map(data => ({kind:'monster',data}));

function icon(e:Entry) {
  if(e.kind==='monster') return art('portrait-'+e.data.sprite);
  return media(e.kind==='passive' && e.data.iconType==='item'?'items':'skills',e.data.iconId);
}

function Preview({clip,name}:{clip:string;name:string}) {
  const [playing,setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return <div className="codex-stage">
    <img className="codex-film" src={art(clip+(playing?'':'-still'))} alt={name+'演示'}/>
    <button className="film-toggle" onClick={()=>setPlaying(!playing)}>{playing?'查看定格':'播放动画'}</button>
  </div>;
}

function Detail({entry}:{entry:Entry}) {
  if(entry.kind==='passive') return <>
    <div className="codex-relic"><img src={icon(entry)} alt=""/></div>
    <h3>{entry.data.name}</h3><p>被动宝物 · 最高 {entry.data.maxLevel} 级</p><p>{entry.data.desc}</p>
  </>;
  if(entry.kind==='monster'){
    const m=entry.data;
    return <><Preview key={m.id} clip={'m-'+m.sprite} name={m.name}/>
      <h3>{m.name}</h3><p className="codex-meta">{m.group} · {m.when}</p>
      <dl className="codex-facts"><dt>出没</dt><dd>{m.where}</dd><dt>应对</dt><dd>{m.tactic}</dd></dl></>;
  }
  const s=entry.data;
  return <><Preview key={s.id} clip={'s-'+s.iconId} name={s.name}/>
    <h3>{s.name}</h3><p className="codex-meta">{classes[s.classType]} · 基础冷却 {s.cooldown} 秒</p>
    <ol className="codex-ranks">{s.upgrades.map(u=><li key={u.level}>
      <span>{u.level}级</span><div>{u.level===s.maxLevel && <b>觉醒 · {u.title}</b>}{u.description}</div>
    </li>)}</ol></>;
}

export function Codex({role,close}:{role:HeroClass;close:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const backButton=useRef<HTMLButtonElement>(null);
  const lastEntry=useRef('');
  const [section,setSection]=useState<'技能'|'怪物'>('技能');
  const [job,setJob]=useState<string>(classes[role]);
  const [group,setGroup]=useState('普通');
  const [entry,setEntry]=useState<Entry|null>(null);
  const list=section==='怪物'?monsters.filter(e=>e.kind==='monster' && e.data.group===group)
    :job==='宝物'?passives:skills.filter(e=>e.kind==='skill' && classes[e.data.classType]===job);
  useEffect(()=>{
    const node=dialog.current!;
    node.showModal();
    return ()=>node.close();
  },[]);
  useEffect(()=>{
    if(entry) backButton.current?.focus();
    else if(lastEntry.current) dialog.current?.querySelector<HTMLElement>('[data-entry="'+lastEntry.current+'"]')?.focus();
  },[entry]);
  const filters=section==='技能'?['战士','法师','道士','宝物']:['普通','精英','领主','首领'];
  function switchSection(next:'技能'|'怪物'){
    lastEntry.current='';setEntry(null);setSection(next);
  }
  return <dialog className="codex" style={{'--codex-ground':"url('"+assetUrl('assets/woool/terrain/paving.webp')+"')"} as React.CSSProperties} ref={dialog} aria-label="传世图鉴" onCancel={e=>{
    e.preventDefault();if(entry)setEntry(null);else close();
  }}>
    <header className="codex-heading">
      {entry?<button className="codex-back" ref={backButton} onClick={()=>setEntry(null)}>‹ {section}目录</button>:<h2>传世图鉴</h2>}
      <button className="codex-close" aria-label="关闭图鉴" onClick={close}>×</button>
    </header>
    {entry?<div key={entry.data.id} className="codex-scroll codex-detail"><Detail entry={entry}/></div>:<>
      <nav className="codex-sections" aria-label="图鉴分类">{(['技能','怪物'] as const).map(sectionName=>
        <button key={sectionName} aria-pressed={section===sectionName} onClick={()=>switchSection(sectionName)}>{sectionName}</button>)}</nav>
      <nav className="codex-filters" aria-label="筛选">{filters.map(f=>
        <button key={f} aria-pressed={(section==='技能'?job:group)===f} onClick={()=>section==='技能'?setJob(f):setGroup(f)}>{f}</button>)}</nav>
      <div className="codex-scroll codex-list" key={section+job+group}>
        {list.map(e=><button className="codex-item" key={e.data.id} data-entry={e.data.id} onClick={()=>{
          lastEntry.current=e.data.id;setEntry(e);
        }}><img src={icon(e)} alt="" loading="lazy"/><span><b>{e.data.name}</b><small>{e.kind==='skill'?'觉醒 · '+e.data.upgrades.at(-1)!.title:e.kind==='monster'?e.data.when:'被动 · '+e.data.maxLevel+' 级'}</small></span><i aria-hidden="true">›</i></button>)}
      </div></>}
  </dialog>;
}
