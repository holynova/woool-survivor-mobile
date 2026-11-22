import assert from 'node:assert/strict';

export async function verifyFieldRules(server) {
  const {GameEngine}=await server.ssrLoadModule('/src/game.ts');
  const {journalKey,readJournal,writeJournal,finishRun}=await server.ssrLoadModule('/src/journal.ts');
  const {chapterLessons}=await server.ssrLoadModule('/src/encounters.ts');
  const create=(chapter='central_state')=>{
    const g=new GameEngine();g.start('warrior',chapter,'standard');
    g.monsters=[];g.player.invulnerableTime=0;
    return g;
  };

  // Use the renderer's 55px thumb radius and 8px dead zone.
  const distances=[12,30,55].map(d=>{
    const g=create(),start=g.player.x;
    g.setInput((d-8)/47,0);g.update(.05);
    return g.player.x-start;
  });
  assert.ok(distances[0]>0 && distances[0]<distances[1] && distances[1]<distances[2]);
  const diagonal=create(),straight=create();
  diagonal.setInput(1,1);straight.setInput(1,0);diagonal.update(.05);straight.update(.05);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x-1280,diagonal.player.y-720)-(straight.player.x-1280))<1e-8);

  const g=create();
  const drop=(type,value)=>({id:700,type,value,x:g.player.x,y:g.player.y});
  for(const miss of [0,1,80]){
    g.drops=[drop('potion',28)];g.damageNumbers=[];g.player.hp=g.player.maxHp-miss;
    const before=g.player.hp;
    g.updateDrops(.05);
    assert.equal(g.player.hp-before,Math.min(miss,28));
    assert.equal(g.drops.length,miss?0:1);
    if(miss)assert.equal(g.damageNumbers.at(-1).text,'+'+Math.min(miss,28)+' 气血');
  }
  g.drops=[drop('exp',2),drop('gold',11)];g.updateDrops(.05);
  assert.deepEqual([g.pickupFeedback.exp,g.pickupFeedback.gold,g.player.exp,g.player.gold],[2,11,2,11]);

  for(const id of Object.keys(chapterLessons)){
    const g=create(id),m=g.spawnMonsterFromChapter(true,undefined,undefined,{x:1350,y:720});
    m.dashCd=0;g.updateMonsterSpawns(0);
    if(id==='central_state')assert.equal(m.bossCast.kind,'charge');
    else assert.ok(g.dangers.length);
    if(id==='heaven_tower')assert.ok(g.dangers[0].inner>0);
    g.killEnemy(m);
    assert.ok(g.respiteUntil>g.clock);
    g.nextRangedWaveAt=0;g.updateMonsterSpawns(.2);assert.equal(g.monsters.length,0);
    g.clock=g.respiteUntil+.01;g.updateMonsterSpawns(0);assert.ok(g.monsters.length>0);
  }

  for(const kind of ['melee','zone','shot','charge']){
    const g=create(),m=g.spawnMonsterFromChapter(false,undefined,'blade_hound',{x:1280,y:720});
    g.player.hp=1;
    if(kind==='melee')g.updateMonsterSpawns(0);
    if(kind==='zone'){
      g.dangers=[{x:1280,y:720,radius:70,inner:0,impact:0,damage:50,owner:m.id}];g.updateMonsterSpawns(0);
    }
    if(kind==='shot'){
      g.enemyShots=[{kind:'arrow',x:1279,y:720,dx:1,dy:0,remaining:5,damage:100,source:m.name,move:'穿甲刀雨'}];
      g.advanceEnemyShots(.1);
    }
    if(kind==='charge'){
      m.bossCast={kind:'charge',name:'铁甲突进',from:{x:1260,y:720},to:{x:1300,y:720},releaseAt:0,hit:false};
      m.x=1260;g.clock=.52;g.advanceBossCast(m);
    }
    assert.equal(g.phase,'game_over');assert.equal(g.deathCause.enemy,m.name);assert.ok(g.deathCause.tip);
    const record=finishRun(readJournal(),g,'game_over').recent[0];
    assert.deepEqual(record.deathCause,g.deathCause);
  }
  for(const id of ['hunter','skirmisher','guardian']){
    const g=create();g.clock=300;g.triggerLevelUp();
    assert.equal(g.rerollChoices(),false);
    const copy=new GameEngine();copy.restore(g.snapshot());
    assert.equal(copy.upgradeChoices.length,3);
    const beforeSpeed=copy.player.speed;
    copy.selectUpgrade(copy.upgradeChoices.find(c=>c.id===id));
    assert.equal(copy.path,id);
    const elite=copy.spawnMonsterFromChapter(true);
    const hp=elite.hp;copy.damageEnemy(elite,100);
    assert.equal(hp-elite.hp,id==='hunter'?125:100);
    if(id==='skirmisher')assert.ok(copy.player.speed>beforeSpeed && copy.player.cooldownBonus<0);
    if(id==='guardian'){const before=copy.player.hp;copy.hitPlayer(100);assert.equal(before-copy.player.hp,85);}
    copy.triggerLevelUp();assert.ok(copy.upgradeChoices.every(c=>c.type!=='path'));
  }
  const old='woool.mobile.journal.v1';
  const stable={...readJournal(),bank:81,saved:null};
  localStorage.setItem(old,JSON.stringify(stable));
  const imported=readJournal();assert.equal(imported.bank,81);
  writeJournal({...imported,bank:10});
  assert.equal(readJournal().bank,10);assert.equal(JSON.parse(localStorage.getItem(old)).bank,81);
  assert.notEqual(journalKey,old);
}
