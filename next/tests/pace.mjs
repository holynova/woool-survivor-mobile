// Run two checkouts with one movement policy. Example: node tests/pace.mjs ../woool-survivor-mobile .
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {steer,choose} from './pilot.mjs';

const roots=process.argv.length>2 ? process.argv.slice(2) : ['.'];
for(const root of roots.map(directory=>resolve(directory))){
  const version=JSON.parse(readFileSync(resolve(root,'package.json'))).version;
  const server=await createServer({root,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
  const random=Math.random;
  try {
    const {GameEngine}=await server.ssrLoadModule('/src/game.ts');
    const {WOOWL_CHAPTERS}=await server.ssrLoadModule('/src/config/chapters.ts');
    for(const [i,id] of Object.keys(WOOWL_CHAPTERS).entries()){
      let seed=125+i;
      Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
      const g=new GameEngine();
      g.start(['warrior','wizard','taoist'][i%3],id,'standard');
      let beforeBoss=0,firstAwakening=null,firstKill=null,pathAt=null;
      for(let step=0;step<20000;step++){
        if(g.phase==='level_up'){
          if(!g.bossSpawned)beforeBoss++;
          if(g.upgradeChoices[0]?.type==='path')pathAt=Math.round(g.clock);
          choose(g);
        }
        if(g.phase!=='battle')break;
        if(step%3===0)steer(g);
        g.update(.1);g.takeEffects();
        if(firstAwakening===null && g.activeSkills.some(s=>s.level===5))firstAwakening=Math.round(g.clock);
        if(firstKill===null && g.player.kills)firstKill=Math.round(g.clock);
      }
      console.log(JSON.stringify({version,chapter:id,role:g.heroClass,seed:125+i,firstKill,firstAwakening,pathAt,
        beforeBoss,result:g.phase,seconds:Math.round(g.clock),lootWindows:g.metrics?.lootWindows.length}));
    }
  } finally {Math.random=random;await server.close();}
}
