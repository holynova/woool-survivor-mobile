import React,{useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type Phaser from 'phaser';
import {game} from './game';
import {Codex} from './Codex';
import {WOOWL_CHAPTERS as chapters} from './config/chapters';
import {WOOWL_SKILLS as skills,WOOWL_PASSIVES as passives} from './config/skills';
import {WOOWL_DIFFICULTY_CURVES as curves, WOOWL_MONSTERS as monsters} from './config/curves';
import {sound} from './audio';
import { Head, Loadout, Records, TrainingPanel, time, media } from './CampaignPanels';
import { journalKey, readJournal, writeJournal, finishRun, train, type Journal, type Checkpoint } from './journal';
import type {HeroClass,DifficultyCurveId} from './types';

const roles=[
  {id:'warrior',name:'战士',skill:skills.attack_slash.name, awakening:skills.attack_slash.upgrades[4].title},
  {id:'wizard',name:'法师',skill:skills.fireball.name, awakening:skills.fireball.upgrades[4].title},
  {id:'taoist',name:'道士',skill:skills.soul_talisman.name+' · 骷髅', awakening:skills.soul_talisman.upgrades[4].title}
] as const;
function meter(value:number,max:number){return Math.max(0,Math.min(100,value/max*100))+'%'}
function pause(){
  if(game.phase==='battle'){game.phase='paused';game.setInput(0,0);game.emit();}
}
export function App(){
  useSyncExternalStore(cb=>game.subscribe(cb),()=>game.version);
  const [role,setRole]=useState<HeroClass>('warrior');
  const [chapter,setChapter]=useState('sunset_island');
  const [difficulty,setDifficulty]=useState<DifficultyCurveId>('standard');
  const [sheet,setSheet]=useState<'maps'|'curves'|'records'|'training'|'loadout'|'retire'|'new'|'codex'|null>(null);
  const [journal,setJournal]=useState(readJournal);
  const journalRef=useRef(journal);
  const [storageError,setStorageError]=useState(false);
  const [monsterSound,setMonsterSound]=useState(sound.monstersEnabled());
  const live=useRef(false);
  function persist(next:Journal){
    journalRef.current=next;
    setJournal(next);
    setStorageError(!writeJournal(next));
  }
  function checkpoint(){
    if(!live.current)return;
    if(game.phase==='victory'||game.phase==='game_over'){
      persist(finishRun(journalRef.current,game,game.phase));
      live.current=false;
    }else if(['battle','paused','level_up'].includes(game.phase)){
      persist({...journalRef.current,saved:structuredClone(game.snapshot())});
    }
  }
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
    live.current=false;stopField();setSheet(null);setProgress(null);setError(false);game.resetForLobby();
  }
  async function start(saved?:Checkpoint, nextChapter=chapter, settled?:Journal){
    if(loading.current)return;
    loading.current=true;
    const token=++generation.current;
    setProgress(0);setError(false);setSheet(null);
    void sound.init(saved?.heroClass ?? role);
    if(saved){
      game.restore(saved);setRole(saved.heroClass);setChapter(saved.chapterId);setDifficulty(saved.difficultyId);
      sound.playBgm(saved.bossSpawned?'boss':'battle',saved.chapterId);
    }else {
      setChapter(nextChapter);
      game.start(role,nextChapter,difficulty,journalRef.current.training);
    }
    const fail=()=>{if(token===generation.current){pause();setError(true);setProgress(0);loading.current=false;}};
    try{
      const {bootField}=await import('./renderer');
      if(token!==generation.current)return;
      let failed=false;
      field.current=bootField(v=>{if(token===generation.current)setProgress(Math.round(v*100))},()=>{
        if(token!==generation.current||failed)return;
        setProgress(null);loading.current=false;live.current=true;
        if(settled)journalRef.current=settled;
        checkpoint();
        if(document.hidden)pause();
      },()=>{failed=true;fail()});
    }catch{fail()}
  }
  useEffect(()=>{
    let lastTime=-10, lastPhase=game.phase;
    const unsubscribe=game.subscribe(()=>{
      if(live.current && (game.phase!==lastPhase || game.clock-lastTime>=5 || game.clock<lastTime)){
        lastTime=game.clock;checkpoint();
      }
      lastPhase=game.phase;
    });
    const leave=()=>{field.current?.events.emit('clear-drag');pause();checkpoint()};
    const hidden=()=>{if(document.hidden)leave()};
    const otherTab=(e:StorageEvent)=>{
      if(e.key!==journalKey)return;
      lobby();
      const latest=readJournal();
      journalRef.current=latest;setJournal(latest);
    };
    window.addEventListener('storage',otherTab);
    window.addEventListener('pagehide',leave);
    document.addEventListener('visibilitychange',hidden);
    return ()=>{unsubscribe();window.removeEventListener('storage',otherTab);window.removeEventListener('pagehide',leave);document.removeEventListener('visibilitychange',hidden);stopField()};
  },[]);
  const toggleSound=()=>setMuted(sound.toggleMute());
  const defenseMinutes=Math.round(map.durationSeconds*curves[difficulty].bossTimeScale/60);
  const closeSheet=()=>setSheet(null);
  const mapOrder=Object.keys(chapters);
  const nextMap=mapOrder[mapOrder.indexOf(chapter)+1];
  const allCleared=journal.cleared.length===mapOrder.length;
  const resume=()=>{game.phase=game.upgradeChoices.length?'level_up':'battle';game.emit();};
  const leaveSaved=()=>{checkpoint();lobby()};
  const retire=()=>{persist(finishRun(journalRef.current,game,'retired'));lobby()};
  return <main>
    {storageError&&<div role="status" className="storage-error">存档失败，请保留此页。</div>}
    {inLobby&&<section className="home" onClickCapture={()=>{if(progress===null)sound.playBgm('menu')}} style={{backgroundImage:'linear-gradient(180deg,#12141316 12%,#11150fe6 61%,#0f120fff 91%),url('+map.bgImage+')'}}>
      <header className="mast"><span>传 世</span><nav><button disabled={progress!==null} onClick={()=>setSheet('codex')}>图鉴</button><button disabled={progress!==null} onClick={()=>setSheet('records')}>战绩</button><button disabled={progress!==null} onClick={()=>setSheet('training')}>修行</button><button onClick={toggleSound}>{muted?'声音关':'声音开'}</button></nav></header>
      <div className="home-body">
        <h1>传奇世界<span>幸存者</span></h1>
        <div className="roles">{roles.map((r,i)=><button key={r.id} aria-pressed={r.id===role} disabled={progress!==null} onClick={()=>setRole(r.id)}>
          <img src={media('ui','head_'+(i+1))} alt=""/><span>{r.name}</span></button>)}</div>
        <div className="brief"><span>{hero.skill} · 五级{hero.awakening}</span><button onClick={()=>setSheet('curves')} disabled={progress!==null}>{curves[difficulty].name} ›</button></div>
        {error?<button className="primary" onClick={lobby}>加载失败 · 返回重试</button>:progress===null?<><button className="primary" onClick={()=>setSheet('maps')}>开始游戏</button>
        {journal.saved&&<button className="resume" onClick={()=>void start(journal.saved!)}>继续上局 · {chapters[journal.saved.chapterId].name.split(' · ')[0]} {time(journal.saved.clock)} ›</button>}</>:<div className="load">准备战场 · {progress}%<progress max="100" value={progress}/></div>}
      </div>
    </section>}
    {sheet==='codex' && <Codex role={inLobby?role:game.heroClass} close={closeSheet}/>}
    {(sheet==='maps'||sheet==='curves')&&<div className="veil"><section className="panel" role="dialog" aria-label={sheet==='maps'?'选择地图':'选择难度'}>
      <div className="panel-head"><h2>{sheet==='maps'?'选择地图':'选择难度'}</h2><button aria-label="关闭" onClick={closeSheet}>×</button></div>
      {sheet==='maps'?Object.values(chapters).map(c=><button className="row chapter-row" aria-pressed={chapter===c.id} key={c.id} data-chapter={c.id}
        onClick={()=>{setChapter(c.id);if(journal.saved)setSheet('new');else void start(undefined,c.id)}}>
        <img loading="lazy" src={c.bgImage.replace('/maps/','/maps/thumbs/')} alt=""/>
        <span><b>{c.name.split(' · ')[0]}</b><small>开场 · {c.opening.map(id=>monsters[id].name).join('、')}</small></span>
        <span className="chapter-target"><small>{journal.cleared.includes(c.id)?'已通关':'首领'}</small>{c.bossName.split(' · ').at(-1)}</span>
      </button>):
      Object.values(curves).map(c=><button className="row" aria-pressed={difficulty===c.id} key={c.id} onClick={()=>{setDifficulty(c.id);closeSheet()}}><span><b>{c.name}</b><small>{c.summary}</small></span></button>)}
    </section></div>}
    {(sheet==='records'||sheet==='training'||sheet==='new')&&<div className="veil"><section className="panel" role="dialog">
      <Head title={{records:'出征战绩',training:'传世修行',new:'另启征程'}[sheet]} close={sheet==='new'?()=>setSheet('maps'):closeSheet}/>
      {sheet==='records'?<Records journal={journal}/>:sheet==='training'?<TrainingPanel journal={journal} buy={id=>persist(train(journalRef.current,id))}/>:
        <><p>结算上局金币，前往{map.name.split(' · ')[0]}？</p><button className="primary" onClick={()=>{
          if(!journal.saved)return;
          game.restore(journal.saved);
          void start(undefined,chapter,finishRun(journalRef.current,game,'retired'));
        }}>结算并出战</button></>}
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
        {game.phase==='level_up'?<><small>等级 {player.level}</small><Head title="选择修炼" close={()=>{field.current?.events.emit('clear-drag');game.phase='paused';game.emit()}}/>{game.upgradeChoices.map(c=><button className={c.type==='skill' && c.level===5?'row awakening':'row'} key={c.id} onClick={()=>game.selectUpgrade(c)}><img src={media(c.type==='passive'&&passives[c.id]?.iconType==='item'||c.iconId>100000?'items':'skills',c.iconId)} alt=""/><span><b>{c.title}</b><small>{c.description}</small></span></button>)}</>:
        game.phase==='paused'?sheet==='loadout'?<><Head title="行囊与技能" close={closeSheet}/><Loadout changed={checkpoint}/></>:
        sheet==='retire'?<><Head title="撤离战场" close={closeSheet}/><p>本局将结束，{player.gold} 金收入库银。</p><button className="primary" onClick={retire}>结算并撤离</button></>:
        <><small>{map.name} · {game.wavePhaseName}</small><Head title="战斗暂停" close={resume}/>
          <p>第 {defenseMinutes} 分钟迎战{map.bossName}。随身 {player.gold} 金。</p>
          <button className="primary" onClick={resume}>继续战斗</button><div className="pause-grid">
          <button disabled={game.upgradeChoices.length>0} onClick={()=>setSheet('loadout')}>行囊与技能</button><button onClick={()=>setSheet('codex')}>图鉴</button><button onClick={leaveSaved}>存档回城</button>
          <button onClick={toggleSound}>{muted?'声音关':'声音开'}</button><button onClick={()=>setMonsterSound(sound.toggleMonsters())}>怪物音效{monsterSound?'开':'关'}</button>
          </div><button className="resume" onClick={()=>setSheet('retire')}>结束本局</button></>:
        <><small>{map.name}</small><Head title={game.phase==='victory'?(allCleared?'全境平定':'守关成功'):'此战已尽'} close={lobby}/><p>存活 {time(game.clock)} · 击败 {player.kills} · 等级 {player.level}<br/>入库 {player.gold} 金 · 已通关 {journal.cleared.length}/{mapOrder.length} 章</p>
          <button className="primary" onClick={()=>{
            const suggested=game.phase==='victory' && nextMap ? nextMap : chapter;
            lobby();setChapter(suggested);setSheet('maps');
          }}>选择地图再战</button><button className="resume" onClick={lobby}>返回大厅</button></>}
      </section></div>}
    </>}
  </main>
}
