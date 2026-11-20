import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
try {
  const {WOOWL_SKILLS:skills}=await server.ssrLoadModule('/src/config/skills.ts');
  const {bestiary}=await server.ssrLoadModule('/src/config/bestiary.ts');
  const {WOOWL_MONSTERS, MILESTONE_LORDS}=await server.ssrLoadModule('/src/config/curves.ts');
  const {WOOWL_CHAPTERS}=await server.ssrLoadModule('/src/config/chapters.ts');
  const clips=new Set();
  for(const skill of Object.values(skills)) clips.add('s-'+skill.iconId);
  assert.equal(clips.size,Object.keys(skills).length);
  for(const monster of bestiary) {
    assert.ok(monster.sprite && monster.tactic && monster.where && monster.when,monster.id);
    clips.add('m-'+monster.sprite);
    readFileSync('public/assets/woool/codex/portrait-'+monster.sprite+'.webp');
  }
  assert.equal(new Set(bestiary.map(m=>m.id)).size,bestiary.length);
  assert.equal(bestiary.length,Object.keys(WOOWL_MONSTERS).length*2+MILESTONE_LORDS.length+Object.keys(WOOWL_CHAPTERS).length);
  for(const clip of clips) {
    const path='public/assets/woool/codex/'+clip;
    const data=readFileSync(path+'.webp');
    assert.equal(data.toString('ascii',8,12),'WEBP',clip);
    let frames=0;
    for(let i=12;i+8<=data.length;){
      const length=data.readUInt32LE(i+4);
      if(data.toString('ascii',i,i+4)==='ANMF') frames++;
      i+=8+length+(length%2);
    }
    assert.ok(frames>=2,clip+' must animate');
    assert.equal(readFileSync(path+'-still.webp').toString('ascii',8,12),'WEBP');
  }
  console.log(clips.size+' animated previews and '+bestiary.length+' monster entries verified.');
} finally {await server.close();}
