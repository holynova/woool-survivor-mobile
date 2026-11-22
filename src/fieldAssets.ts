import type Phaser from 'phaser';
import { WOOWL_CHAPTERS } from './config/chapters';
import { WOOWL_MONSTERS } from './config/curves';
import { WOOWL_SKILLS } from './config/skills';
import { game } from './game';

const minionArt={skeleton:['m_20081','fx_1004','fx_3008'],enhanced_skeleton:['m_20082','fx_1004','fx_3012'],shinsu:['m_20085','fx_2001','fx_3007']};
const extra:Record<string,string[]> = {
  thunder_sword:['fx_1102_more'], celestial_meteor:['fx_2202'],
  summon_skeleton:minionArt.skeleton, enhanced_skeleton:minionArt.enhanced_skeleton, shinsu_summon:minionArt.shinsu
};
function skillAssets(id:string) {
  return ['fx_'+WOOWL_SKILLS[id].iconId,...(extra[id]??[])];
}
function queue(scene:Phaser.Scene,key:string) {
  const parts=key.slice(key.indexOf('_')+1);
  const root='./assets/woool/';
  if(key.startsWith('boss_') || key.startsWith('bossCast_')){
    const stem=parts+(key.startsWith('bossCast_') ? '-cast' : '');
    scene.load.atlas(key,root+'bosses/'+stem+'.webp',root+'bosses/'+stem+'.json');
    return;
  }
  const stem=key.startsWith('m_') ? 'monsters/'+key+'@0' : 'skills_fx/s_'+parts.replace('_more','')+(key.endsWith('_more')?'@1':'@0');
  scene.load.atlas(key,root+stem+'.png',root+stem+'.json');
}

// Only start a new Phaser loader batch after the preceding batch has registered
// its animations. This also covers picking a card while its texture is in flight.
export class FieldAssets {
  private readonly chapter=WOOWL_CHAPTERS[game.chapterId];
  private readonly opening=this.chapter.opening.map(id=>'m_'+WOOWL_MONSTERS[id].spriteKey);
  private readonly waves=[...new Set([...this.chapter.monsterPool.map(m=>m.typeId),...this.chapter.lordTypes,this.chapter.rangedType]
    .map(id=>'m_'+WOOWL_MONSTERS[id].spriteKey))];
  private readonly boss=['boss_'+this.chapter.bossSpriteKey,'bossCast_'+this.chapter.bossSpriteKey];
  private ready=new Set<string>();
  private initial=new Set<string>();
  private busy=false;
  private signature='';
  private required:string[]=[];
  private desired:string[]=[];
  private failures=new Map<string,number>();
  private notice?:HTMLElement;
  constructor(private scene:Phaser.Scene,private register:()=>void){}
  preload(){
    for (const key of this.opening) this.initial.add(key);
    for (const s of game.activeSkills) for(const key of skillAssets(s.id))this.initial.add(key);
    for (const m of game.minions) for(const key of minionArt[m.type])this.initial.add(key);
    for (const m of game.monsters) if(!m.isBoss && m.spriteKey)this.initial.add('m_'+m.spriteKey);
    const flightArt={fireball:2001,shinsu_hit:2001,meteor:2202,talisman:3002,ghost_fire_curse:3011};
    for (const f of game.flights) this.initial.add('fx_'+flightArt[f.kind]);
    if(game.clock>=30)for(const key of this.waves)this.initial.add(key);
    if(game.clock>=game.getBossTriggerTime()-1 || game.bossSpawned)for(const k of this.boss)this.initial.add(k);
    for (const key of this.initial)queue(this.scene,key);
  }
  start(){
    for(const key of this.initial)if(this.scene.textures.exists(key))this.ready.add(key);
    const notice=document.createElement('span');
    notice.className='field-buffer';notice.setAttribute('role','status');notice.hidden=true;
    notice.textContent='准备战斗画面…';document.getElementById('world')?.append(notice);
    this.notice=notice;
    this.scene.events.once('shutdown',()=>notice.remove());
  }
  update(){
    const waveStage=game.clock>=30?2:game.clock>=2?1:0;
    const remaining=game.getBossTriggerTime()-game.clock;
    const bossStage=remaining<=1 || game.bossSpawned?2:remaining<=60?1:0;
    const active=game.activeSkills.map(s=>s.id);
    const offers=game.upgradeChoices.filter(c=>c.type==='skill').map(c=>c.id);
    const signature=[waveStage,bossStage,...active,'|',...offers].join(',');
    if(signature!==this.signature){
      this.signature=signature;
      const keys=new Set(active.flatMap(skillAssets));
      if(waveStage===2)for(const key of this.waves)keys.add(key);
      if(bossStage===2)for(const k of this.boss)keys.add(k);
      this.required=[...keys];
      this.desired=[...new Set([...keys,...offers.flatMap(skillAssets),...(waveStage?this.waves:[]),...(bossStage?this.boss:[])])];
    }
    const blocked=this.required.some(key=>!this.ready.has(key));
    if(this.notice)this.notice.hidden=!blocked || game.phase!=='battle';
    if(!this.busy){
      const keys=this.desired.filter(key=>!this.ready.has(key) && (this.failures.get(key)??0)<3);
      if(keys.length){
        this.busy=true;
        for(const key of keys)queue(this.scene,key);
        this.scene.load.once('complete',()=>{
          for(const key of keys){
            if(this.scene.textures.exists(key))this.ready.add(key);
            else this.failures.set(key,(this.failures.get(key)??0)+1);
          }
          this.register();this.busy=false;
        });
        this.scene.load.start();
      } else if(blocked){
        this.scene.game.events.emit('field-error');
      }
    }
    return !blocked;
  }
}
