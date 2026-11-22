import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
try {
  const {GameEngine}=await server.ssrLoadModule('/src/game.ts');
  const {CHARGE_RADIUS,CHARGE_TIME}=await server.ssrLoadModule('/src/boss.ts');
  const {FOOT_OFFSET}=await server.ssrLoadModule('/src/terrain.ts');
  const engine=new GameEngine();
  engine.start('warrior','central_state','standard');
  engine.monsters=[];
  engine.spawnBoss();
  const boss=engine.getActiveBoss();
  const centre={x:1280,y:720};
  Object.assign(boss,{x:1600,y:920,dashCd:99});
  const camZoom=.75;
  function target(dx,dy) {
    // Project the shadow to CSS pixels and place it at the specified warning edge.
    const foot={x:(centre.x+dx)*camZoom,y:(centre.y+FOOT_OFFSET+dy)*camZoom};
    engine.player.x=foot.x/camZoom;
    engine.player.y=foot.y/camZoom-FOOT_OFFSET;
    engine.player.invulnerableTime=0;engine.player.hp=engine.player.maxHp;
  }
  for(const inner of [0,54])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const cases=[[109,true],[111,false]];
    if(inner)cases.push([53,false],[55,true]);
    for(const [distance,expected] of cases) {
      target(dx*distance,dy*distance);
      engine.dangers=[{...centre,inner,radius:110,owner:boss.id,damage:16,impact:engine.clock,color:0xe45645}];
      engine.updateMonsterSpawns(0);
      assert.equal(engine.player.hp<engine.player.maxHp,expected,'circle/ring boundary');
    }
  }
  const from={x:centre.x-70,y:centre.y},to={x:centre.x+70,y:centre.y};
  for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]])for(const offset of [-1,1]){
    const border=CHARGE_RADIUS+offset;
    target(dx*(70+border),dy*border);
    Object.assign(boss,from,{bossCast:{kind:'charge',name:'铁甲突进',from,to,releaseAt:0,hit:false}});
    engine.clock=CHARGE_TIME+.01;engine.advanceBossCast(boss);
    assert.equal(engine.player.hp<engine.player.maxHp,offset<0,'sides and ends of swept charge');
  }
  console.log('Foot projection checked on four sides of a circle, annulus and charge within 0.75 CSS pixels.');
} finally {await server.close();}
