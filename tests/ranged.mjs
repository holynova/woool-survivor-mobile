import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
try {
  const {GameEngine} = await server.ssrLoadModule('/src/game.ts');
  const {WOOWL_CHAPTERS} = await server.ssrLoadModule('/src/config/chapters.ts');
  const {WOOWL_MONSTERS, WOOWL_DIFFICULTY_CURVES, evaluateCurveState} = await server.ssrLoadModule('/src/config/curves.ts');
  const {monsterFootprint}=await server.ssrLoadModule('/src/terrain.ts');
  const {missiles, rangedWave} = await server.ssrLoadModule('/src/ranged.ts');
  for (const chapter of Object.values(WOOWL_CHAPTERS)) {
    for (const difficulty of Object.keys(WOOWL_DIFFICULTY_CURVES)) {
      const g = new GameEngine();
      g.start('wizard',chapter.id,difficulty);
      const opener = g.monsters[0], arch = WOOWL_MONSTERS[opener.typeId];
      const state = evaluateCurveState(difficulty,chapter.chapterDifficulty,0,600);
      assert.equal(opener.maxHp, 2 * Math.round(arch.hp * state.hpMult));
      g.monsters = [];
      g.clock = 34.99;
      g.updateMonsterSpawns(0);
      assert.equal(g.monsters.length,0);
      g.clock = 35;
      g.updateMonsterSpawns(0);
      const m = g.monsters[0];
      assert.equal(m.typeId,chapter.rangedType);
      const kind = WOOWL_MONSTERS[m.typeId].missile;
      const {windup} = missiles[kind];
      const hp = g.player.hp;
      Object.assign(m,{x:g.player.x+64,y:g.player.y});
      g.player.invulnerableTime = 0;
      g.updateMonsterSpawns(0);
      assert.ok(m.aim);
      assert.equal(g.enemyShots.length,0);
      g.clock += windup+.01;
      g.updateMonsterSpawns(0);
      assert.equal(g.enemyShots.length,m.typeId==='triple_serpent'?3:1);
      assert.equal(g.player.hp,hp);
      const checkpoint = g.snapshot();
      const dodged = new GameEngine();
      dodged.restore(checkpoint);
      assert.deepEqual(dodged.enemyShots,g.enemyShots);
      assert.equal(dodged.nextRangedWaveAt,g.nextRangedWaveAt);
      dodged.phase = 'battle';
      dodged.player.y += 65;
      dodged.advanceEnemyShots(3);
      assert.equal(dodged.player.hp,hp);
      assert.equal(dodged.enemyShots.length,0);
      g.advanceEnemyShots(3);
      assert.ok(g.player.hp<hp);
      const after = g.player.hp;
      g.advanceEnemyShots(3);
      assert.equal(g.player.hp,after);

      m.nextShotAt = 0;
      g.updateMonsterSpawns(0);
      assert.ok(m.aim);
      m.stunUntil = g.clock+2;
      g.clock += windup+.01;
      g.updateMonsterSpawns(0);
      assert.equal(m.aim,undefined);
      assert.equal(g.enemyShots.length,0);
      for (const mark of [130,200,330,490,610]) {
        g.monsters = [];
        for(let wave=0;wave<10;wave++){
          g.clock=mark;
          g.nextRangedWaveAt=mark;
          g.updateMonsterSpawns(0);
        }
        assert.equal(g.monsters.filter(m=>m.typeId===chapter.rangedType).length,rangedWave(mark).cap);
      }
    }
  }
  const city=new GameEngine();
  city.start('wizard','central_state','standard');
  const chapter=WOOWL_CHAPTERS.central_state;
  const anchors=[{x:1280,y:720},{x:1200,y:590},{x:90,y:90}];
  const random=Math.random;
  let usedCourtyard=false;
  try {
    for(const [ix,location] of anchors.entries())for(let i=0;i<16;i++) {
      Math.random=()=>i/16;
      Object.assign(city.player,location,{invulnerableTime:0});
      city.monsters=[];city.clock=city.nextRangedWaveAt=35;
      city.updateMonsterSpawns(0);
      const archer=city.monsters[0];
      assert.equal(archer.typeId,chapter.rangedType);
      const distance=Math.hypot(archer.x-location.x,archer.y-location.y);
      assert.ok(distance>=305-.001 && distance<=375,'ranged deployment ring');
      assert.ok(archer.x>=80 && archer.y>=80 && archer.x<=2480 && archer.y<=1360);
      assert.equal(city.terrain.settle({x:archer.x,y:archer.y},monsterFootprint(archer)),false);
      assert.equal(archer.aim,undefined);
      if(ix===2)continue; // A corner has no road within the deployment ring.
      const edge=city.terrain.streetEdge(archer.x,archer.y);
      assert.ok(Math.abs(edge)<40,'accessible street or courtyard');
      usedCourtyard ||= city.terrain.region.route(archer.x,archer.y)>15 && edge<10;
    }
  } finally {Math.random=random;}
  assert.ok(usedCourtyard,'reinforcement uses a front walk beyond the main streets');
  const unit={x:1280,y:720};
  const first=city.terrain.cityRangedPost(unit,340,0,13,[]);
  const next=city.terrain.cityRangedPost(unit,340,0,13,[first]);
  assert.ok(Math.hypot(first.x-next.x,first.y-next.y)>50,'split firing posts');
  const g = new GameEngine();
  g.start('wizard','sunset_island','standard');
  const saved = g.snapshot();
  delete saved.encounterVersion;
  delete saved.enemyShots;
  delete saved.nextRangedWaveAt;
  const old = saved.monsters[0];
  old.hp=13;old.maxHp=29;
  g.restore(saved);
  assert.deepEqual([g.monsters[0].hp,g.monsters[0].maxHp],[26,58]);
  g.restore(g.snapshot());
  assert.equal(g.monsters[0].maxHp,58);
  const ob=g.terrain.props[0], hp=g.player.hp;
  Object.assign(g.player,{x:ob.x+ob.rx+40,y:ob.y,invulnerableTime:0});
  g.phase='battle';
  g.enemyShots=[{kind:'arrow',x:ob.x-ob.rx-40,y:ob.y,dx:1,dy:0,remaining:500,damage:80}];
  g.advanceEnemyShots(3);
  assert.equal(g.enemyShots.length,0);
  assert.equal(g.player.hp,hp);
  console.log('Eight regional ranged enemies across four difficulties: waves, windup, flight, dodge, damage, stun, cover and checkpoints verified.');
} finally { await server.close(); }
