import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { steer,choose } from './pilot.mjs';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
const random=Math.random;
try {
  const {GameEngine}=await server.ssrLoadModule('/src/game.ts');
  const {WOOWL_CHAPTERS:chapters}=await server.ssrLoadModule('/src/config/chapters.ts');
  const {WOOWL_SKILLS:skills}=await server.ssrLoadModule('/src/config/skills.ts');
  const {readJournal,writeJournal,finishRun,train}=await server.ssrLoadModule('/src/journal.ts');
  const memory=new Map();
  globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
  const setSeed=n=>{let state=n;Math.random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296)};
  setSeed(123);
  for(const def of Object.values(skills))for(let level=1;level<=def.maxLevel;level++){
    const g=new GameEngine();g.start(def.classType,'sunset_island','standard');
    for(const m of g.monsters){m.x=g.player.x+35;m.y=g.player.y;m.hp=m.maxHp=100000;}
    g.player.hp-=30;g.minions=[];g.takeEffects();
    assert.equal(g.triggerSkill(def.id,level,def),true,def.id+' level '+level);
    assert.ok(g.takeEffects().length || g.minions.length,def.id+' missing feedback');
  }
  // Pickups, spending and a pending upgrade must survive a reload without duplicating rewards.
  const trial=new GameEngine();trial.start('wizard','sunset_island','standard');
  trial.monsters=[];
  function drop(type, value, slot) {
    trial.drops.push({id:1000+trial.drops.length,type,value,slot,x:trial.player.x,y:trial.player.y});
    trial.update(.05);
  }
  drop('gear',2,'weapon');
  assert.equal(trial.equipment.weapon,2);assert.equal(trial.player.damageBonus,.38);
  drop('gear',1,'weapon');
  assert.equal(trial.equipment.weapon,2);assert.equal(trial.player.gold,18);
  drop('gear',3,'armor');assert.equal(trial.equipment.armor,3);
  drop('gold',100);
  trial.phase='paused';
  assert.equal(trial.changeSkill('fireball'),false);
  assert.equal(trial.changeSkill('fireball','moon_blade'),false);
  assert.equal(trial.changeSkill('fireball','lightning_strike'),true);
  assert.equal(trial.player.gold,38);assert.equal(trial.activeSkills[0].level,1);
  trial.activeSkills.push({id:'fireball',level:1,cdTimer:0});
  assert.equal(trial.changeSkill('lightning_strike'),true);
  trial.phase='battle';drop('exp',trial.player.maxExp);
  assert.equal(trial.phase,'level_up');assert.equal(trial.drops.length,0);
  writeJournal({...readJournal(),saved:trial.snapshot()});
  const restored=new GameEngine();restored.restore(readJournal().saved);
  assert.equal(restored.phase,'level_up');assert.deepEqual(restored.upgradeChoices,trial.upgradeChoices);
  restored.selectUpgrade(restored.upgradeChoices[0]);assert.equal(restored.phase,'battle');
  assert.equal(restored.upgradeChoices.length,0);
  const gold=restored.player.gold;
  const retired=finishRun(readJournal(),restored,'retired');assert.equal(retired.bank,gold);
  assert.equal(retired.saved,null);assert.equal(train(retired,'might'),retired);
  memory.clear();
  const ids=Object.keys(chapters),roles=['warrior','wizard','taoist'];
  let j=readJournal(),results=[];
  for(const [i,id] of ids.entries()){
    setSeed(125+i);
    let g=new GameEngine();g.start(roles[i%3],id,'standard');
    let restored=false, milestone=0, sawBoss=false, peak=0;
    for(let step=0;step<20000;step++){
      if(g.phase==='level_up')choose(g);
      if(g.phase!=='battle')break;
      if(step%3===0)steer(g);
      g.update(.1);g.takeEffects();
      if(g.clock>=310 && !restored){
        writeJournal({...j,saved:g.snapshot()});
        const saved=readJournal().saved;
        assert.ok(saved);
        const previous=JSON.stringify(g.player);
        g=new GameEngine();g.restore(saved);assert.equal(JSON.stringify(g.player),previous);
        if(g.phase==='paused')g.phase='battle';
        restored=true;
      }
      peak=Math.max(peak,g.monsters.length);milestone=Math.max(milestone,g.snapshot().milestones.length);
      sawBoss ||= g.bossSpawned;
    }
    console.log(id,g.heroClass,g.phase,Math.round(g.clock)+'s','Lv'+g.player.level,'kills='+g.player.kills,'peak='+peak,'gold='+g.player.gold);
    results.push({id,phase:g.phase,restored,milestone,sawBoss});
    j=finishRun(j,g,g.phase);assert.equal(finishRun(j,g,g.phase),j);
  }
  for(const r of results){assert.equal(r.phase,'victory',r.id);assert.ok(r.restored && r.milestone===3 && r.sawBoss,r.id);}
  assert.equal(j.cleared.length,6);
  const trained=train(j,'might');assert.equal(trained.training.might,1);assert.equal(trained.bank,j.bank-360);
  console.log('Six complete standard runs, 23 skills × four ranks, checkpoints and settlement verified.');
} finally {Math.random=random;await server.close()}
