import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createServer} from 'vite';

const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
try {
  const {game}=await vite.ssrLoadModule('/src/game.ts');
  const {FieldAssets}=await vite.ssrLoadModule('/src/fieldAssets.ts');
  const {WOOWL_SKILLS:skills}=await vite.ssrLoadModule('/src/config/skills.ts');
  const {WOOWL_CHAPTERS:chapters}=await vite.ssrLoadModule('/src/config/chapters.ts');
  globalThis.document={createElement(){return {setAttribute(){},remove(){}}},getElementById(){return null}};
  for(const [chapter,c] of Object.entries(chapters))for(const role of ['warrior','wizard','taoist']){
    game.start(role,chapter,'standard');
    const loaded=new Set(),queue=new Set();
    let complete=()=>{};
    const scene={textures:{exists:key=>loaded.has(key)},events:{once(){}},
      load:{atlas(key,image,json){
        for(const url of [image,json]) assert.ok(existsSync(new URL('../public/'+url,import.meta.url)),url);
        assert.ok(!loaded.has(key),key+' redundantly fetched');
        queue.add(key);
      },start(){},once(event,fn){assert.equal(event,'complete');complete=fn}}};
    function finish(){ for(const key of queue)loaded.add(key);queue.clear();complete(); }
    const assets=new FieldAssets(scene,()=>{});
    assets.preload();finish();assets.start();
    assert.ok(assets.update());
    assert.ok(![...loaded].some(k=>k.startsWith('boss')));
    for(const skill of Object.values(skills).filter(s=>s.classType===role)){
      game.upgradeChoices=[{type:'skill',id:skill.id}];assets.update();
      game.activeSkills=[{id:skill.id,level:1}];
      assert.equal(assets.update(),loaded.has('fx_'+skill.iconId));
      finish();assert.ok(assets.update());
    }
    game.clock=4;assert.ok(assets.update());finish();
    game.clock=game.getBossTriggerTime()-40;
    assert.ok(assets.update());
    for(const key of ['boss_','bossCast_'])assert.ok(queue.has(key+c.bossSpriteKey));
    game.clock+=40;
    assert.equal(assets.update(),false,'first attack must wait for both atlases');
    finish();assert.ok(assets.update());
  }
  console.log('Opening, skill offers, selection during loading and boss streaming verified for all chapter/class pairs.');
} finally {await vite.close()}
