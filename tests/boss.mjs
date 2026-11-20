import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
try {
  const {GameEngine}=await server.ssrLoadModule('/src/game.ts');
  const {WOOWL_CHAPTERS}=await server.ssrLoadModule('/src/config/chapters.ts');
  const {WOOWL_SKILLS}=await server.ssrLoadModule('/src/config/skills.ts');
  const {bossKits,stunMonster,slowMonster,planBossCast,CHARGE_TIME}=await server.ssrLoadModule('/src/boss.ts');
  function encounter(chapter) {
    const g=new GameEngine();
    g.start('wizard',chapter,'standard');
    g.monsters=[];g.spawnBoss();
    const boss=g.getActiveBoss();
    Object.assign(boss,{x:g.player.x-70,y:g.player.y,dashCd:0});
    g.player.invulnerableTime=0;
    return {g,boss};
  }
  for(const chapter of Object.keys(WOOWL_CHAPTERS)){
    const key=WOOWL_CHAPTERS[chapter].bossSpriteKey;
    const frames=path=>JSON.parse(readFileSync(new URL('../public/assets/woool/'+path,import.meta.url))).frames;
    const original=frames('monsters/m_'+key+'@0.json');
    const hd=frames('bosses/'+key+'.json');
    assert.deepEqual(Object.keys(hd).sort(),Object.keys(original).filter(k=>k.includes('/walk/')).sort(),key+' animations');
    const packed=[];
    for(const [name,spec] of Object.entries(hd)){
      const source=original[name], r=spec.frame;
      for(const prop of ['sourceSize','spriteSourceSize']) {
        for(const [axis,value] of Object.entries(source[prop])) assert.equal(spec[prop][axis],value*2,name+' '+axis);
      }
      assert.equal(r.w,source.frame.w*2);assert.equal(r.h,source.frame.h*2);
      assert.ok(r.x>=2 && r.y>=2 && r.x+r.w+2<=2048 && r.y+r.h+2<=2048);
      assert.ok(packed.every(a=>r.x>=a.x+a.w+4 || a.x>=r.x+r.w+4 || r.y>=a.y+a.h+4 || a.y>=r.y+r.h+4),name+' atlas bleed');
      packed.push(r);
    }
    const kit=bossKits[chapter];
    const {g,boss}=encounter(chapter);
    // Use the runtime scheduler to enter all three casts and return to the first.
    for(const [i,name] of [kit.signature,kit.volley,kit.special,kit.signature].entries()) {
      boss.dashCd=0;g.updateMonsterSpawns(0);
      const cast=boss.bossCast;
      assert.equal(cast.name,name);
      assert.ok(cast.releaseAt>g.clock+.7);
      const hp=g.player.hp;
      g.advanceBossCast(boss);
      assert.equal(g.player.hp,hp);
      const resumed=new GameEngine();
      resumed.restore(g.snapshot());
      assert.deepEqual(resumed.getActiveBoss().bossCast,cast);
      assert.equal(resumed.getActiveBoss().bossStep,boss.bossStep);
      resumed.update(.1);
      assert.deepEqual(resumed.getActiveBoss().bossCast,cast,'paused');
      g.clock=cast.releaseAt;
      if(cast.kind==='ground') {
        assert.ok(g.dangers.length>0);
      } else if(cast.kind==='volley') {
        assert.equal(g.enemyShots.length,0);
        assert.equal(cast.count,3);
      } else if(cast.kind==='charge'){
        assert.equal(boss.x,cast.from.x);
        g.clock+=CHARGE_TIME+.01;
      } else {
        assert.equal(cast.species,kit.minion);
      }
      g.advanceBossCast(boss);
      assert.equal(boss.bossCast,undefined);
      if(i===1) {
        assert.equal(g.enemyShots.length,3);
        assert.ok(g.enemyShots.every(s=>s.kind===kit.missile));
        g.enemyShots=[];
      }
      if(cast.kind==='charge') {
        assert.equal(boss.x,cast.to.x);
        assert.ok(g.player.hp<hp,'crossed player once');
        const hitHp=g.player.hp;
        g.advanceBossCast(boss);
        assert.equal(g.player.hp,hitHp);
      }
      if(cast.kind==='summon') {
        assert.equal(g.monsters.filter(m=>m.summonedBy===boss.id).length,2);
        for(let k=0;k<3;k++) {
          boss.bossCast=structuredClone(cast);
          g.advanceBossCast(boss);
        }
        assert.equal(g.monsters.filter(m=>m.summonedBy===boss.id).length,4);
      }
      g.dangers=[];
    }
    boss.hp=boss.maxHp/2;
    boss.bossStep=1;boss.dashCd=0;g.updateMonsterSpawns(0);
    assert.equal(boss.bossCast.count,5);
    assert.equal(boss.dashCd,2.8);
    const cast=structuredClone(boss.bossCast),before=structuredClone(g.snapshot());
    g.clock=cast.releaseAt;
    g.updateMonsterSpawns(0);
    assert.equal(g.enemyShots.length,5);
    const resumed=new GameEngine();resumed.restore(before);
    resumed.clock=cast.releaseAt;resumed.phase='battle';resumed.updateMonsterSpawns(0);
    assert.deepEqual(resumed.enemyShots,g.enemyShots,'continued launch');
    resumed.updateMonsterSpawns(0);assert.equal(resumed.enemyShots.length,5);
  }
  const {g,boss}=encounter('central_state');
  const origin=boss.x;
  g.triggerSkill('lion_roar',5,WOOWL_SKILLS.lion_roar);
  assert.equal(boss.stunUntil,.45);
  assert.equal(origin-boss.x,9);
  g.clock=.6;g.triggerSkill('lightning_strike',5,WOOWL_SKILLS.lightning_strike);
  assert.equal(boss.stunUntil,.45,'repeat stun protected');
  g.clock=2.3;g.triggerSkill('lightning_strike',5,WOOWL_SKILLS.lightning_strike);
  assert.ok(Math.abs(boss.stunUntil-2.5)<.001,'control available again');
  const regular={...boss,isBoss:false,stunGuardUntil:0,stunUntil:0,slowUntil:0};
  stunMonster(regular,3,2.8);slowMonster(regular,3,4);slowMonster(boss,3,4);
  assert.equal(regular.stunUntil,5.8);
  assert.equal(regular.slowUntil,7);
  assert.equal(boss.slowUntil,4.6);
  boss.bossStep=2;
  const cast=planBossCast(g.chapterId,boss,g.player,g.terrain,g.clock);
  boss.bossCast=cast;
  const placed=boss.x;g.repel(boss,0,90);assert.equal(boss.x,placed);
  const hp=g.player.hp;g.player.y+=80;g.clock=cast.releaseAt+CHARGE_TIME+.01;g.advanceBossCast(boss);
  assert.equal(g.player.hp,hp,'sidestepped locked charge');
  const prop=g.terrain.props[0];
  Object.assign(boss,{x:prop.x-100,y:prop.y,bossStep:2});
  const blocked=planBossCast(g.chapterId,boss,{x:prop.x+100,y:prop.y},g.terrain,g.clock);
  assert.ok(blocked.to.x<prop.x,'solid terrain clips warning and charge');
  const saved=structuredClone(g.snapshot()),old=saved.monsters.find(m=>m.isBoss);
  delete old.bossStep;delete old.stunGuardUntil;
  old.stunUntil=saved.clock+2.8;old.slowUntil=saved.clock+4;
  g.restore(saved);
  const migrated=g.getActiveBoss();
  assert.equal(migrated.stunUntil,g.clock+.45);
  const once=migrated.slowUntil;
  g.restore(g.snapshot());assert.equal(g.getActiveBoss().slowUntil,once);
  console.log('Eight boss rotations, rage, control resistance, terrain, safe lanes, summon caps and cast checkpoints verified.');
} finally {await server.close();}
