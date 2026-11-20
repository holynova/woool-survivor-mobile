import { WOOWL_CHAPTERS } from './chapters';
import { ELITE_MILESTONES, MILESTONE_LORDS, WOOWL_MONSTERS } from './curves';

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
    const opening = ['deer','scarecrow'].includes(monster.id);
    const anywhere = opening || elite && monster.id==='enhanced_skeleton';
    const locations = chapters.filter(c => c.monsterPool.some(m => m.typeId===monster.id));
    entries.push({
      id:(elite?'elite-':'')+monster.id, group:elite?'精英':'普通',
      name:(elite?'精英·':'')+monster.name, sprite:monster.spriteKey,
      where:anywhere?'六章均可遇见':locations.map(c => shortName(c.name)).join('、'),
      when:opening?'各章开局可遇':elite?'周期性增援':'随怪潮出现',
      tactic:elite?(monster.id==='wild_boar'?'':traits[monster.id])+'精英会在脚下蓄力震地。':traits[monster.id]
    });
  }
}
MILESTONE_LORDS.forEach((lord,i) => {
  const seconds=ELITE_MILESTONES[i];
  entries.push({id:'lord-'+i,group:'领主',name:lord.name.replace('【境霸·','').replace('】',''),
    sprite:lord.spriteKey,where:'六章均可遇见',when:Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' 登场',
    tactic:'近身会蓄力震地。离开预警范围，再回身输出。'});
});
for (const c of chapters) entries.push({id:'boss-'+c.id,group:'首领',name:c.bossName.split(' · ').at(-1)!,
  sprite:c.bossSpriteKey,where:shortName(c.name),when:'10:00 登场',tactic:bossTactics[c.id]});
export const bestiary = entries;
