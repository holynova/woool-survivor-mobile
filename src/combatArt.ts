import type Phaser from 'phaser';
import type { HeroClass } from './types';
import { assetUrl } from './utils';

export {gearTier} from './config/equipment';
export function preloadEquipmentArt(scene: Phaser.Scene, role:HeroClass) {
  for(const layer of ['r','w']) {
    const key='outfit_'+role+'_'+layer;
    const path=assetUrl('assets/woool/equipment/'+role+'-'+layer);
    scene.load.atlas(key,path+'.webp',path+'.json');
  }
}

// The original body and weapon layers use the same 512px pivot and exact
// numbered poses. A shared pose keeps the grip aligned through an eight-way run.
export function registerArmorAnimations(scene:Phaser.Scene,role:HeroClass) {
  const key='outfit_'+role+'_r';
  if(!scene.textures.exists(key))return;
  for(const tier of [1,2])for(const dir of [0,1,2,3,4])for(const [action,count,fps] of [['run',12,12],['stand',4,4]] as const){
    const anim=key+'_'+tier+'_'+action+'_'+dir;
    if(scene.anims.exists(anim)) continue;
    const frames=Array.from({length:count},(_,i)=>({key,frame:'r'+tier+'/'+action+'/'+dir+String(i).padStart(4,'0')+'.png'}));
    scene.anims.create({key:anim,frames,frameRate:fps,repeat:-1});
  }
}
