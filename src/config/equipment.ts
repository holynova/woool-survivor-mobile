import type { HeroClass } from '../types';

export type GearSlot = 'weapon' | 'armor';
export type Equipment = Record<GearSlot, number>;
const weapons = {
  warrior: { name: '斩马刀', icon: 5030104 },
  wizard: { name: '焰纹法杖', icon: 5020103 },
  taoist: { name: '玄纹道剑', icon: 5010104 }
};
const armors = {
  warrior: { name: '赤金战甲', icon: 5110505 },
  wizard: { name: '法神长袍', icon: 5120505 },
  taoist: { name: '天师道袍', icon: 5130504 }
};
export const gearColors = [0xffffff, 0xc5edac, 0x89c8ff, 0xce9eff, 0xffcd73];
const grades = ['初行', '精制', '上品', '珍品', '神品'];
export function gearInfo(role: HeroClass, slot: GearSlot, rank: number) {
  const item = slot === 'weapon'
    ? (rank === 0 ? {name: '青锋剑', icon: 5010101} : weapons[role])
    : armors[role];
  return {...item, title: grades[rank] + '·' + item.name, color: gearColors[rank]};
}
export type Training = { might: number; vitality: number; fortune: number };
export const freshTraining = (): Training => ({might: 0, vitality: 0, fortune: 0});
export const disciplines = {
  might: {name:'兵法', description:'每重增加 4% 伤害'},
  vitality: {name:'炼体', description:'每重增加 15 点气血'},
  fortune: {name:'聚宝', description:'每重增加 8 点拾取距离'}
};
export const trainingCost = (rank: number) => [360, 1800, 5000, 12000, 24000][rank] ?? 0;
