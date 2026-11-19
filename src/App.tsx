import React,{useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type Phaser from 'phaser';
import {game} from './game';
import {WOOWL_CHAPTERS as chapters} from './config/chapters';
import {WOOWL_SKILLS as skills,WOOWL_PASSIVES as passives} from './config/skills';
import {WOOWL_DIFFICULTY_CURVES as curves} from './config/curves';
import {sound} from './audio';
import type {HeroClass,DifficultyCurveId} from './types';

const roles=[
  {id:'warrior',name:'战士',skill:skills.attack_slash.name},
  {id:'wizard',name:'法师',skill:skills.fireball.name},
  {id:'taoist',name:'道士',skill:skills.soul_talisman.name+' · 骷髅'}
] as const;
const time=(s:number)=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const media=(folder:string,file:string|number)=>'./assets/woool/'+folder+'/'+file+'.png';
function meter(value:number,max:number){return Math.max(0,Math.min(100,value/max*100))+'%'}
function pause(){
  if(game.phase==='battle'){game.phase='paused';game.setInput(0,0);game.emit();}
}
export function App(){
  useSyncExternalStore(cb=>game.subscribe(cb),()=>game.version);
  const [role,setRole]=useState<HeroClass>('warrior');
  const [chapter,setChapter]=useState('sunset_island');
  const [difficulty,setDifficulty]=useState<DifficultyCurveId>('standard');
  const [sheet,setSheet]=useState<'maps'|'curves'|null>(null);
  const [progress,setProgress]=useState<number|null>(null);
  const [error,setError]=useState(false);
  const [muted,setMuted]=useState(sound.isMuted());
  const field=useRef<Phaser.Game|null>(null);
  const generation=useRef(0);
  const loading=useRef(false);
  const map=chapters[chapter], hero=roles.find(r=>r.id===role)!;
  const player=game.player,boss=game.getActiveBoss();
  const inLobby=game.phase==='lobby'||progress!==null;
  function stopField(){
    generation.current++;loading.current=false;
    field.current?.destroy(true);field.current=null;
  }
  function lobby(){
    stopField();setProgress(null);setError(false);game.resetForLobby();
  }
  async function start(){
    if(loading.current)return;
    loading.current=true;
    const token=++generation.current;
    setProgress(0);setError(false);setSheet(null);
    void sound.init();
    game.start(role,chapter,difficulty);
    const fail=()=>{if(token===generation.current){pause();setError(true);setProgress(0);loading.current=false;}};
    try{
      const {bootField}=await import('./renderer');
      if(token!==generation.current)return;
      let failed=false;
      field.current=bootField(v=>{if(token===generation.current)setProgress(Math.round(v*100))},()=>{
        if(token!==generation.current||failed)return;
        setProgress(null);loading.current=false;
        if(document.hidden)pause();
      },()=>{failed=true;fail()});
    }catch{fail()}
  }
  useEffect(()=>{
    const hidden=()=>{if(document.hidden){field.current?.events.emit('clear-drag');pause()}};
    document.addEventListener('visibilitychange',hidden);
    return ()=>{document.removeEventListener('visibilitychange',hidden);stopField()};
  },[]);
  const toggleSound=()=>setMuted(sound.toggleMute());
  const defenseMinutes=Math.round(map.durationSeconds*curves[difficulty].bossTimeScale/60);
  const closeSheet=()=>setSheet(null);
  return <main>
    {inLobby&&<section className="home" style={{backgroundImage:'linear-gradient(180deg,#12141316 12%,#11150fe6 61%,#0f120fff 91%),url('+map.bgImage+')'}}>
      <header className="mast"><span>传 世</span><button onClick={toggleSound}>{muted?'声音关':'声音开'}</button></header>
      <div className="home-body">
        <h1>传奇世界<span>幸存者</span></h1>
        <button className="map-choice" onClick={()=>setSheet('maps')} disabled={progress!==null}><small>出征地图</small><strong>{map.name.split(' · ')[0]}</strong><span>换图 ›</span></button>
        <div className="roles">{roles.map((r,i)=><button key={r.id} aria-pressed={r.id===role} disabled={progress!==null} onClick={()=>setRole(r.id)}>
          <img src={media('ui','head_'+(i+1))} alt=""/><span>{r.name}</span></button>)}</div>
        <div className="brief"><span>起手 · {hero.skill}</span><button onClick={()=>setSheet('curves')} disabled={progress!==null}>{curves[difficulty].name} ›</button></div>
        {error?<button className="primary" onClick={lobby}>加载失败 · 返回重试</button>:progress===null?<button className="primary" onClick={start}>出 战</button>:<div className="load">准备战场 · {progress}%<progress max="100" value={progress}/></div>}
      </div>
    </section>}
    {sheet&&<div className="veil"><section className="panel" role="dialog" aria-label={sheet==='maps'?'选择地图':'选择难度'}>
      <div className="panel-head"><h2>{sheet==='maps'?'选择地图':'选择难度'}</h2><button aria-label="关闭" onClick={closeSheet}>×</button></div>
      {sheet==='maps'?Object.values(chapters).map(c=><button className="row" aria-pressed={chapter===c.id} key={c.id} onClick={()=>{setChapter(c.id);closeSheet()}}><img loading="lazy" src={c.bgImage} alt=""/><span><b>{c.name}</b><small>{c.bossName}</small></span></button>):
      Object.values(curves).map(c=><button className="row" aria-pressed={difficulty===c.id} key={c.id} onClick={()=>{setDifficulty(c.id);closeSheet()}}><span><b>{c.name}</b><small>{c.summary}</small></span></button>)}
    </section></div>}
    {!inLobby&&<>
      <div className="top"><span>{time(game.clock)}</span><button aria-label="暂停" onClick={()=>{field.current?.events.emit('clear-drag');pause()}}>Ⅱ</button></div>
      {boss&&<div className="boss">{boss.name}<i style={{width:meter(boss.hp,boss.maxHp)}}/></div>}
      {game.alertBanner&&<div className="alert">{game.alertBanner.title}</div>}
      <footer><div className="hud"><div className="health"><small>气血</small><strong>{Math.ceil(player.hp)} / {player.maxHp}</strong><i style={{width:meter(player.hp,player.maxHp)}}/></div>
        <div className="slots">{game.activeSkills.map(s=><div className="slot" key={s.id} title={skills[s.id].name}><img src={media('skills',skills[s.id].iconId)} alt={skills[s.id].name}/><i style={{height:meter(s.cdTimer,s.maxCd||skills[s.id].cooldown)}}/><b>{s.level}</b></div>)}</div></div>
        <div className="xp"><span>Lv. {player.level}</span><div><i style={{width:meter(player.exp,player.maxExp)}}/></div><span>{player.kills} 斩</span></div>
      </footer>
      {game.phase!=='battle'&&<div className="veil"><section className="panel" role="dialog">
        {game.phase==='level_up'?<><small>等级 {player.level}</small><h2>选择修炼</h2>{game.upgradeChoices.map(c=><button className="row" key={c.id} onClick={()=>game.selectUpgrade(c)}><img src={media(c.type==='passive'&&passives[c.id]?.iconType==='item'||c.iconId>100000?'items':'skills',c.iconId)} alt=""/><span><b>{c.title}</b><small>{c.description}</small></span></button>)}</>:
        game.phase==='paused'?<><small>{map.name}</small><h2>战斗暂停</h2><p>拖动战场移动，技能自动施放。第 {defenseMinutes} 分钟迎战{map.bossName}。</p><p>{game.activeSkills.map(s=>skills[s.id].name+' '+s.level+'级').join(' · ')}</p><button className="primary" onClick={()=>{game.phase='battle';game.emit()}}>继续战斗</button><div className="actions"><button onClick={toggleSound}>{muted?'打开声音':'关闭声音'}</button><button onClick={lobby}>结束本局</button></div></>:
        <><small>{map.name}</small><h2>{game.phase==='victory'?'守关成功':'此战已尽'}</h2><p>存活 {time(game.clock)} · 击败 {player.kills} · 等级 {player.level}</p><button className="primary" onClick={lobby}>返回大厅</button></>}
      </section></div>}
    </>}
  </main>
}
