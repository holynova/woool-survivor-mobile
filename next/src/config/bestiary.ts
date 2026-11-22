import { bossKits } from '../boss';
import { WOOWL_CHAPTERS } from './chapters';
import { ELITE_MILESTONES, WOOWL_MONSTERS } from './curves';

export interface MonsterEntry {
  id: string;
  group: '普通' | '精英' | '领主' | '首领';
  name: string;
  sprite: string;
  where: string;
  when: string;
  tactic: string;
}

const chapters = Object.values(WOOWL_CHAPTERS);
const shortName = (name: string) => name.split(' · ')[0];
const traits: Record<string,string> = {
  spore_bloom:'花冠亮起后吐出孢子，侧移让开。',
  demon_archer:'拉弓后沿直线射箭，可用城郊树干挡箭。',
  sand_cactus:'刺尖发亮后射出飞刺，横穿弹道躲避。',
  mud_viper:'昂首蓄力后吐出毒液，可借树干掩护。',
  frost_lancer:'枪尖凝霜时侧移，冰枪会飞向先前的位置。',
  cinder_archer:'拉弓凝火后射出火矢，绕过石柱接近。',
  triple_serpent:'三颗蛇首同时吐出扇形毒弹，拉远后穿过空隙。',
  field_spider:'体型小，成群接近时容易被草木遮住。',
  staff_hound:'持棍追击，沿城郊石道两侧压近。',
  marsh_fisher:'常与蟾群一同逼近，沿泥路退开。',
  marsh_toad:'贴地接近，在草丛边留出走位空间。',
  sand_scorpion:'贴着沙地接近，勿被小群包围。',
  sand_golem:'移动较慢，气血较厚，可绕石柱牵制。',
  sand_vulture:'速度快，容易越过前排沙怪。',
  sand_wolf:'沿沙道追击，横移拉开身位。',
  pale_wraith:'身影贴近雪色，留意接近的轮廓。',
  shadow_warrior:'与幽魂结伴逼近，沿侧面脱身。',
  cinder_imp:'身形矮小，会穿过高大魔兽之间的空隙。',
  demon_axeman:'持斧步行逼近，提早清出退路。',
  inferno_demon:'气血高、步伐慢，适合拉开距离集火。',
  red_serpent:'与甲虫协同推进，绕开蛇群的正面。',
  black_serpent:'蛇王的重甲近卫，气血高于红蛇妖。',
  shell_beetle:'伏在岩地低处，留意两侧的小型甲虫。',
  firebird:'飞掠接近，常先于塔中的使者抵达。',
  soul_envoy:'缓步靠近，远离鸟群和使者的合围。',
  flame_envoy:'掌心亮起后射出魂火，侧移躲开后再接近。',
  scarecrow:'成群缓步逼近，保持移动可以带开怪群。',
  deer:'步速较快，容易从缓慢的怪群中追上来。',
  snake:'左右摆动逼近，沿弧线走位更容易拉开距离。',
  wild_boar:'靠近后会短距离加速，向侧面闪开。',
  blade_hound:'在中距离斜切包抄，留意两侧的退路。',
  skeleton:'持续追击，容易与前方的怪物形成夹击。',
  enhanced_skeleton:'气血较厚，保留退路再集中攻击。',
  shinsu_puppet:'步伐缓慢，近身伤害高，适合拉开距离打。'
};
const bossTactics: Record<string,string> = {
  serpent_valley:'三头蛇王向前方扇面喷射三股毒息，绕到身侧躲避。',
  heaven_tower:'教主从脚下向外引爆两圈法阵，避开第一圈后切回内侧。',
  sunset_island:'尸王原地震地，移出脚下的圆形预警。',
  central_state:'刀卫沿面前直线连续砸击，横移脱离路径。',
  hot_desert:'沙震形成圆环，靠近兽王的内圈安全。',
  deadwater_marsh:'三团毒雾依次爆发，持续走出落点。',
  frozen_citadel:'先躲脚下冰爆，再回内圈避开第二击。',
  iron_citadel:'先避开脚下熔岩，再绕过四周的四个爆点。'
};
const entries: MonsterEntry[] = [];
for (const monster of Object.values(WOOWL_MONSTERS)) {
  for (const elite of [false,true]) {
    const locations = chapters.filter(c => c.rangedType===monster.id || c.monsterPool.some(m => m.typeId===monster.id));
    const opening = locations.some(c=>c.opening.includes(monster.id));
    entries.push({
      id:(elite?'elite-':'')+monster.id, group:elite?'精英':'普通',
      name:(elite?'精英·':'')+monster.name, sprite:monster.spriteKey,
      where:locations.map(c => shortName(c.name)).join('、'),
      when:elite?'周期性增援':monster.missile?'0:35 起增援':opening?'先遣怪群':'后续怪潮',
      tactic:elite?(monster.id==='wild_boar'?'':traits[monster.id])+'精英会在脚下蓄力震地。':traits[monster.id]
    });
  }
}
for (const chapter of chapters) chapter.lordTypes.forEach((type,i) => {
  const lord=WOOWL_MONSTERS[type], seconds=ELITE_MILESTONES[i];
  entries.push({id:'lord-'+chapter.id+'-'+i,group:'领主',name:lord.name+'领主',
    sprite:lord.spriteKey,where:shortName(chapter.name),when:Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' 登场',
    tactic:'近身会蓄力震地。离开预警范围，再回身输出。'});
});
for (const c of chapters) entries.push({id:'boss-'+c.id,group:'首领',name:c.bossName.split(' · ').at(-1)!,
  sprite:'boss-'+c.bossSpriteKey,where:shortName(c.name),when:'10:00 登场',tactic:bossTactics[c.id]+' '+bossKits[c.id].volley+'要横移，'+bossKits[c.id].special+(bossKits[c.id].minion?'会召来近卫。':'要让开冲撞路线。')+'半血后出招加快。'});
export const bestiary = entries;
