import React,{useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type Phaser from 'phaser';
import {game} from './game';
import {enraged} from './boss';
import {Codex} from './Codex';
import {GameDialog} from './GameDialog';
import {GameSettings} from './GameSettings';
import {prepareTrial,trialId,trials} from './trial';
import {freshTraining} from './config/equipment';
import {WOOWL_CHAPTERS as chapters} from './config/chapters';
import {WOOWL_SKILLS as skills} from './config/skills';
import {WOOWL_DIFFICULTY_CURVES as curves, WOOWL_MONSTERS as monsters} from './config/curves';
import {sound} from './audio';
import { Head, UpgradePanel, Loadout, Records, TrainingPanel, time, media } from './CampaignPanels';
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
  const trial=trialId && trials[trialId];
  const [role,setRole]=useState<HeroClass>(trial?.role??'warrior');
  const [chapter,setChapter]=useState<string>(trial?.chapter??'sunset_island');
  const [difficulty,setDifficulty]=useState<DifficultyCurveId>('standard');
  const [sheet,setSheet]=useState<'maps'|'curves'|'records'|'training'|'loadout'|'retire'|'new'|'codex'|'settings'|null>(null);
  const [journal,setJournal]=useState<Journal>(()=>trial
    ? {version:1,bank:0,training:freshTraining(),recent:[],cleared:[],saved:null} : readJournal());
  const journalRef=useRef(journal);
  const [storageError,setStorageError]=useState(false);
  const [moveHint,setMoveHint]=useState(()=>{
    if(trial)return true;
    try{return localStorage.getItem('woool.mobile.learnedMove')!=='1';}catch{return true;}
  });
  const origin=useRef<{x:number;y:number}|null>(null);
  const live=useRef(false);
  function persist(next:Journal){
    journalRef.current=next;
    setJournal(next);
    if(!trial)setStorageError(!writeJournal(next));
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
  const field=useRef<Phaser.Game|null>(null);
  const generation=useRef(0);
  const loading=useRef(false);
  const trialDetach=useRef<(()=>void)|null>(null);
  const map=chapters[chapter], hero=roles.find(r=>r.id===role)!;
  const player=game.player,boss=game.getActiveBoss();
  const inLobby=game.phase==='lobby'||progress!==null;
  function stopField(){
    trialDetach.current?.();trialDetach.current=null;
    generation.current++;loading.current=false;sound.cancelUnused();
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
    if(saved){
      game.restore(saved);setRole(saved.heroClass);setChapter(saved.chapterId);setDifficulty(saved.difficultyId);
      sound.playBgm(saved.bossSpawned?'boss':'battle',saved.chapterId);
    }else {
      setChapter(nextChapter);
      game.start(role,nextChapter,difficulty,journalRef.current.training);
      if(trialId)trialDetach.current=prepareTrial(game,trialId);
    }
    void sound.init(game.heroClass,game.activeSkills.map(s=>s.id));
    const fail=()=>{if(token===generation.current){pause();setError(true);setProgress(0);loading.current=false;}};
    try{
      const {bootField}=await import('./renderer');
      if(token!==generation.current)return;
      let failed=false;
      field.current=bootField(v=>{if(token===generation.current)setProgress(Math.round(v*100))},()=>{
        if(token!==generation.current||failed)return;
        origin.current={x:game.player.x,y:game.player.y};
        setProgress(null);loading.current=false;live.current=true;
        if(settled)journalRef.current=settled;
        checkpoint();
        if(document.hidden)pause();
      },()=>{failed=true;fail()});
    }catch{fail()}
  }
  useEffect(()=>{
    let lastTime=-10, lastPhase=game.phase, pendingAudio='';
    const unsubscribe=game.subscribe(()=>{
      if(live.current) {
        const ids=[...game.activeSkills.map(s=>s.id),...game.upgradeChoices.filter(c=>c.type==='skill').map(c=>c.id)];
        const signature=ids.join(',');
        if(signature!==pendingAudio){pendingAudio=signature;void sound.prepareSkills(ids);}
      }
      if(live.current && (game.phase!==lastPhase || game.clock-lastTime>=5 || game.clock<lastTime)){
        lastTime=game.clock;checkpoint();
      }
      lastPhase=game.phase;
    });
    const leave=()=>{field.current?.events.emit('clear-drag');pause();checkpoint()};
    const hidden=()=>{sound.setVisible(!document.hidden);if(document.hidden)leave()};
    const escape=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && !event.repeat && live.current && game.phase==='battle' && !document.querySelector('dialog[open]')){
        event.preventDefault();field.current?.events.emit('clear-drag');pause();
      }
    };
    const otherTab=(e:StorageEvent)=>{
      if(trial || e.key!==journalKey)return;
      lobby();
      const latest=readJournal();
      journalRef.current=latest;setJournal(latest);
    };
    window.addEventListener('keydown',escape);
    window.addEventListener('storage',otherTab);
    window.addEventListener('pagehide',leave);
    document.addEventListener('visibilitychange',hidden);
    return ()=>{unsubscribe();window.removeEventListener('keydown',escape);window.removeEventListener('storage',otherTab);window.removeEventListener('pagehide',leave);document.removeEventListener('visibilitychange',hidden);stopField()};
  },[]);
  useEffect(()=>{
    const point=origin.current;
    if(moveHint && game.phase==='battle' && point && player.moving && Math.hypot(player.x-point.x,player.y-point.y)>3) {
      setMoveHint(false);
      if(!trial)try{localStorage.setItem('woool.mobile.learnedMove','1');}catch{}
    }
  },[moveHint,player.x,player.y,player.moving]);
  const feedback=game.pickupFeedback;
  const picking=feedback && feedback.until>game.clock;
  const growth=game.lastGrowth && game.lastGrowth.until>game.clock ? game.lastGrowth.title : null;
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
    {inLobby&&trial&&<section className="home trial-home" style={{backgroundImage:'linear-gradient(180deg,#16161111,#10130de8 80%),url('+map.bgImage+')'}}>
      <div className="home-body"><h1>{trial.name}</h1><p>{trial.tip}</p>
        {error?<button className="primary" onClick={lobby}>加载失败 · 返回重试</button>:
          progress===null?<button className="primary" onClick={()=>void start(undefined,trial.chapter)}>试招</button>:
            <div className="load">准备战场 · {progress}%<progress max="100" value={progress}/></div>}
      </div></section>}
    {inLobby&&!trial&&<section className="home" onClickCapture={()=>{if(progress===null)sound.playBgm('menu')}} style={{backgroundImage:'linear-gradient(180deg,#12141316 12%,#11150fe6 61%,#0f120fff 91%),url('+map.bgImage+')'}}>
      <header className="mast"><span>传 世</span><nav><button disabled={progress!==null} onClick={()=>setSheet('codex')}>图鉴</button><button disabled={progress!==null} onClick={()=>setSheet('records')}>战绩</button><button disabled={progress!==null} onClick={()=>setSheet('training')}>修行</button><button disabled={progress!==null} onClick={()=>setSheet('settings')}>设置</button></nav></header>
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
    {sheet==='settings' && inLobby && <GameDialog label="设置"><Head title="设置" close={closeSheet}/><GameSettings/></GameDialog>}
    {(sheet==='maps'||sheet==='curves')&&<GameDialog key={sheet} label={sheet==='maps'?'选择地图':'选择难度'}>
      <div className="panel-head"><h2>{sheet==='maps'?'选择地图':'选择难度'}</h2><button aria-label="关闭" onClick={closeSheet}>×</button></div>
      {sheet==='maps'?Object.values(chapters).map(c=><button className="row chapter-row" aria-pressed={chapter===c.id} key={c.id} data-chapter={c.id}
        onClick={()=>{setChapter(c.id);if(journal.saved)setSheet('new');else void start(undefined,c.id)}}>
        <img loading="lazy" src={c.bgImage.replace('/maps/','/maps/thumbs/')} alt=""/>
        <span><b>{c.name.split(' · ')[0]}</b><small>开场 · {c.opening.map(id=>monsters[id].name).join('、')}</small></span>
        <span className="chapter-target"><small>{journal.cleared.includes(c.id)?'已通关':'首领'}</small>{c.bossName.split(' · ').at(-1)}</span>
      </button>):
      Object.values(curves).map(c=><button className="row" aria-pressed={difficulty===c.id} key={c.id} onClick={()=>{setDifficulty(c.id);closeSheet()}}><span><b>{c.name}</b><small>{c.summary}</small></span></button>)}
    </GameDialog>}
    {(sheet==='records'||sheet==='training'||sheet==='new')&&<GameDialog key={sheet} label={{records:'出征战绩',training:'传世修行',new:'另启征程'}[sheet]}>
      <Head title={{records:'出征战绩',training:'传世修行',new:'另启征程'}[sheet]} close={sheet==='new'?()=>setSheet('maps'):closeSheet}/>
      {sheet==='records'?<Records journal={journal}/>:sheet==='training'?<TrainingPanel journal={journal} buy={id=>persist(train(journalRef.current,id))}/>:
        <><p>结算上局金币，前往{map.name.split(' · ')[0]}？</p><button className="primary" onClick={()=>{
          if(!journal.saved)return;
          game.restore(journal.saved);
          void start(undefined,chapter,finishRun(journalRef.current,game,'retired'));
        }}>结算并出战</button></>}
    </GameDialog>}
    {!inLobby&&<>
      <div className="top"><span>{time(game.clock)}</span><button aria-label="暂停" onClick={()=>{field.current?.events.emit('clear-drag');pause()}}>Ⅱ</button></div>
      {boss&&<div className="boss"><div className="boss-title"><span>{boss.name.split(' · ').at(-1)}</span><small>{boss.bossCast?.name ?? (enraged(boss)?'狂暴':'')}</small></div><i style={{width:meter(boss.hp,boss.maxHp)}}/></div>}
      {game.alertBanner&&<div className="alert" role="status"><b>{game.alertBanner.title}</b><small>{game.alertBanner.subtitle}</small></div>}
      {game.phase==='battle' && !game.alertBanner && (moveHint || growth || (!trial && game.respiteUntil>game.clock)) &&
        <div className="field-note">{moveHint ? '在战场任意处拖动移动' : growth ?? '怪潮暂缓 · 收集战利品'}</div>}
      <footer><div className="hud"><div className="health"><small>气血</small><strong>{Math.ceil(player.hp)} / {player.maxHp}</strong><i style={{width:meter(player.hp,player.maxHp)}}/></div>
        <div className="slots">{game.activeSkills.map(s=><div className="slot" key={s.id} title={skills[s.id].name}><img src={media('skills',skills[s.id].iconId)} alt={skills[s.id].name}/><i style={{height:meter(s.cdTimer,s.maxCd||skills[s.id].cooldown)}}/><b>{s.level}</b></div>)}</div></div>
        <div className="xp"><span>Lv. {player.level}</span><div className={picking && feedback.exp?'xp-gained':''} role="progressbar" aria-label="升级经验" aria-valuemin={0} aria-valuemax={player.maxExp} aria-valuenow={Math.floor(player.exp)}><i style={{width:meter(player.exp,player.maxExp)}}/></div>
          {picking && feedback.exp>0 && <span className="exp-gain">经验 +{feedback.exp}</span>}
          <span className={picking && feedback.gold?'coins-gained':'coins'}>金 {player.gold}{picking && feedback.gold>0 && <em> +{feedback.gold}</em>}</span><span>{player.kills} 斩</span></div>
      </footer>
      {game.phase!=='battle'&&<GameDialog key={game.phase+':'+(sheet==='codex'?'':sheet??'')} label={game.phase==='level_up'?'选择修炼':game.phase==='paused'?'战斗菜单':'战斗结算'}>
        {game.phase==='level_up'?<UpgradePanel changed={checkpoint} close={()=>{field.current?.events.emit('clear-drag');game.phase='paused';game.emit()}}/>:
        game.phase==='paused'?sheet==='loadout'?<><Head title="行囊与技能" close={closeSheet}/><Loadout changed={checkpoint}/></>:
        sheet==='settings'?<><Head title="设置" close={closeSheet}/><GameSettings/></>:
        sheet==='retire'?<><Head title="撤离战场" close={closeSheet}/><p>本局将结束，{player.gold} 金收入库银。</p><button className="primary" onClick={retire}>结算并撤离</button></>:
        <><small>{map.name} · {game.wavePhaseName}</small><Head title="战斗暂停" close={resume}/>
          <p>第 {defenseMinutes} 分钟迎战{map.bossName}。随身 {player.gold} 金。</p>
          <button className="primary" onClick={resume}>继续战斗</button><div className="pause-grid">
          <button disabled={game.upgradeChoices.length>0} onClick={()=>setSheet('loadout')}>行囊与技能</button><button onClick={()=>setSheet('codex')}>图鉴</button><button onClick={trial?lobby:leaveSaved}>{trial?'返回试招':'存档回城'}</button>
          <button onClick={()=>setSheet('settings')}>设置</button>
          </div>{!trial&&<button className="resume" onClick={()=>setSheet('retire')}>结束本局</button>}</>:
        <><small>{map.name}</small><Head title={game.phase==='victory'?(allCleared?'全境平定':'守关成功'):'此战已尽'} close={lobby}/><p>存活 {time(game.clock)} · 击败 {player.kills} · 等级 {player.level}<br/>入库 {player.gold} 金 · 已通关 {journal.cleared.length}/{mapOrder.length} 章</p>
          {game.phase==='game_over' && game.deathCause && <div className="last-hit"><b>{game.deathCause.enemy} · {game.deathCause.move}</b><small>{game.deathCause.tip}</small></div>}
          <div className="build-recap"><small>{game.pathName || '本局修炼'}</small>
            {game.activeSkills.map(s=><span key={s.id}><img src={media('skills',skills[s.id].iconId)} alt=""/>{skills[s.id].name} {s.level}</span>)}</div>
          <button className="primary" onClick={()=>{
            if(trial){lobby();void start(undefined,trial.chapter);return;}
            const suggested=game.phase==='victory' && nextMap ? nextMap : chapter;
            lobby();setChapter(suggested);setSheet('maps');
          }}>{trial?'再试一次':'选择地图再战'}</button><button className="resume" onClick={lobby}>{trial?'返回试招':'返回大厅'}</button></>}
      </GameDialog>}
    </>}
  </main>
}
