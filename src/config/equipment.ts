import type { HeroClass } from '../types';

export type GearSlot = 'weapon' | 'armor';
export type Equipment = Record<GearSlot, number>;
const starter = { name:'练功木剑',icon:5010101 };
const weapons = {
  warrior: [starter,{name:'斩马刀',icon:5010104},{name:'玄铁阔刃',icon:5010107}],
  wizard: [starter,{name:'焰纹法杖',icon:5020103},{name:'翠玉权杖',icon:5020107}],
  taoist: [starter,{name:'弧月刀',icon:5030104},{name:'玄纹道剑',icon:5030107}]
};
const armors = {
  warrior: [{name:'练功布衣',icon:5110501},{name:'铁鳞战甲',icon:5110503},{name:'赤金战甲',icon:5110505}],
  wizard: [{name:'法师袍',icon:5120503},{name:'法神长袍',icon:5120505},{name:'炎阳法袍',icon:5120507}],
  taoist: [{name:'素色道衣',icon:5130503},{name:'天师道袍',icon:5130504},{name:'碧焰法衣',icon:5130507}]
};
export const gearTier = (rank:number) => rank >= 3 ? 2 : rank > 0 ? 1 : 0;
export const gearColors = [0xffffff, 0xc5edac, 0x89c8ff, 0xce9eff, 0xffcd73];
const grades = ['初行', '精制', '上品', '珍品', '神品'];
export function gearInfo(role: HeroClass, slot: GearSlot, rank: number) {
  const item=(slot==='weapon' ? weapons : armors)[role][gearTier(rank)];
  return {...item,title:grades[rank]+'·'+item.name,color:gearColors[rank]};
}
export type Training = { might: number; vitality: number; fortune: number };
export const freshTraining = (): Training => ({might: 0, vitality: 0, fortune: 0});
export const disciplines = {
  might: {name:'兵法', description:'每重增加 4% 伤害'},
  vitality: {name:'炼体', description:'每重增加 15 点气血'},
  fortune: {name:'聚宝', description:'每重增加 8 点拾取距离'}
};
export const trainingCost = (rank: number) => [360, 1800, 5000, 12000, 24000][rank] ?? 0;
