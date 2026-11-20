import type { ChapterDefinition } from '../types';

export const WOOWL_CHAPTERS: Record<string, ChapterDefinition> = {
  sunset_island: {
    id: 'sunset_island',
    name: '落霞岛 · 桃林原野',
    subtitle: '落霞春晖乘帆渡 · 桃林原野海潮生',
    bgImage: './assets/woool/maps/village-classic.jpg',
    bossName: '狂暴白骨尸王',
    bossSpriteKey: '20082',
    bossHp: 12000,
    bossDamage: 35,
    chapterDifficulty: 1.0,
    targetKills: 600,
    durationSeconds: 600,
    ambientTheme: 'peach',
    description: '桃林中的稻草人和角鹿先到，毒蜘蛛和野猪随后逼近。',
    opening: ['scarecrow', 'deer'],
    lordTypes: ['field_spider', 'wild_boar', 'blade_hound'],
    monsterPool: [
      {typeId:'scarecrow', weight:30},
      {typeId:'deer', weight:25},
      {typeId:'field_spider', weight:23},
      {typeId:'wild_boar', weight:17},
      {typeId:'blade_hound', weight:12}
    ]
  },
  central_state: {
    id: 'central_state',
    name: '中州平原 · 王城近郊',
    subtitle: '三圣王远征至此 · 建中州不拔之国',
    bgImage: './assets/woool/maps/map_central_city.jpg',
    bossName: '中州守将 · 铁甲刀卫',
    bossSpriteKey: '20111',
    bossHp: 18000,
    bossDamage: 42,
    chapterDifficulty: 1.22,
    targetKills: 800,
    durationSeconds: 600,
    ambientTheme: 'embers',
    description: '棍犬与刀犬巡守城郊军道，骷髅援军随后出城。',
    opening: ['staff_hound', 'blade_hound'],
    lordTypes: ['staff_hound', 'skeleton', 'enhanced_skeleton'],
    monsterPool: [
      {typeId:'staff_hound', weight:30},
      {typeId:'blade_hound', weight:25},
      {typeId:'wild_boar', weight:23},
      {typeId:'skeleton', weight:17},
      {typeId:'enhanced_skeleton', weight:12}
    ]
  },
  hot_desert: {
    id: 'hot_desert',
    name: '热砂荒漠 · 荒原戈壁',
    subtitle: '黄沙漫天遮蔽日 · 荒原戈壁战妖魔',
    bgImage: './assets/woool/maps/map_desert_city.jpg',
    bossName: '沙海霸主 · 赤鬃兽王',
    bossSpriteKey: '20046',
    bossHp: 25000,
    bossDamage: 50,
    chapterDifficulty: 1.45,
    targetKills: 1000,
    durationSeconds: 600,
    ambientTheme: 'sand',
    description: '沙蝎与土狼沿沙道合围，沙雕和沙怪从戈壁深处加入。',
    opening: ['sand_scorpion', 'sand_wolf'],
    lordTypes: ['sand_scorpion', 'sand_vulture', 'sand_golem'],
    monsterPool: [
      {typeId:'sand_scorpion', weight:30},
      {typeId:'sand_wolf', weight:25},
      {typeId:'sand_vulture', weight:23},
      {typeId:'sand_golem', weight:17}
    ]
  },
  deadwater_marsh: {
    id: 'deadwater_marsh',
    name: '死水沼泽 · 幽林沼地',
    subtitle: '阴风鬼火沉古沼 · 幽林湿地困千军',
    bgImage: './assets/woool/maps/map_forbidden_ruins.jpg',
    bossName: '幽沼毒君 · 碧鳞蛇王',
    bossSpriteKey: '20038',
    bossHp: 32000,
    bossDamage: 58,
    chapterDifficulty: 1.68,
    targetKills: 1200,
    durationSeconds: 600,
    ambientTheme: 'wisp',
    description: '癞蛤蟆和鱼人盘踞沼地，毒蟒穿过泥径增援。',
    opening: ['marsh_toad', 'marsh_fisher'],
    lordTypes: ['marsh_toad', 'marsh_fisher', 'red_serpent'],
    monsterPool: [
      {typeId:'marsh_toad', weight:30},
      {typeId:'marsh_fisher', weight:25},
      {typeId:'snake', weight:23},
      {typeId:'field_spider', weight:17},
      {typeId:'red_serpent', weight:12}
    ]
  },
  frozen_citadel: {
    id: 'frozen_citadel',
    name: '玄冰雪原 · 苍月极地',
    subtitle: '千里冰封雪满野 · 苍月烽火战极寒',
    bgImage: './assets/woool/maps/map_frozen_city.jpg',
    bossName: '玄冰圣王 · 霜角灵鹿',
    bossSpriteKey: '20072',
    bossHp: 40000,
    bossDamage: 66,
    chapterDifficulty: 1.92,
    targetKills: 1400,
    durationSeconds: 600,
    ambientTheme: 'frost',
    description: '幽魂和幽影武士穿行雪原，角鹿与骷髅从冰道赶来。',
    opening: ['pale_wraith', 'shadow_warrior'],
    lordTypes: ['pale_wraith', 'shadow_warrior', 'enhanced_skeleton'],
    monsterPool: [
      {typeId:'pale_wraith', weight:30},
      {typeId:'shadow_warrior', weight:25},
      {typeId:'deer', weight:23},
      {typeId:'skeleton', weight:17},
      {typeId:'enhanced_skeleton', weight:12}
    ]
  },
  iron_citadel: {
    id: 'iron_citadel',
    name: '铁血魔渊 · 熔岩荒原',
    subtitle: '黑石熔岩镇八荒 · 铁血魔渊血染衣',
    bgImage: './assets/woool/maps/map_iron_citadel.jpg',
    bossName: '铁血魔王 · 灭世魔君',
    bossSpriteKey: '20085',
    bossHp: 52000,
    bossDamage: 75,
    chapterDifficulty: 2.2,
    targetKills: 1600,
    durationSeconds: 600,
    ambientTheme: 'lava',
    description: '鬼方火卒和猛魔刀斧手守住熔岩路口，炎魔坐镇深处。',
    opening: ['cinder_imp', 'demon_axeman'],
    lordTypes: ['cinder_imp', 'demon_axeman', 'inferno_demon'],
    monsterPool: [
      {typeId:'cinder_imp', weight:30},
      {typeId:'demon_axeman', weight:25},
      {typeId:'shinsu_puppet', weight:23},
      {typeId:'inferno_demon', weight:17},
      {typeId:'shadow_warrior', weight:12}
    ]
  },
  serpent_valley: {
    id:'serpent_valley', name:'蛇魔谷 · 五蛇殿',subtitle:'五蛇殿',
    bgImage:'./assets/woool/maps/serpent_valley.jpg',bossName:'三头蛇王',bossSpriteKey:'hydra_king',
    bossHp:54000,bossDamage:77,chapterDifficulty:2.25,targetKills:1700,durationSeconds:600,
    ambientTheme:'wisp',description:'穿过甲虫密布的岩径，迎战五蛇殿的三头蛇王。',
    opening: ['shell_beetle', 'red_serpent'],
    lordTypes: ['shell_beetle', 'red_serpent', 'black_serpent'],
    monsterPool: [
      {typeId:'shell_beetle', weight:30},
      {typeId:'red_serpent', weight:25},
      {typeId:'black_serpent', weight:23},
      {typeId:'snake', weight:17},
      {typeId:'marsh_fisher', weight:12}
    ]
  },
  heaven_tower: {
    id:'heaven_tower',name:'通天塔 · 九重云霄',subtitle:'九重云霄',
    bgImage:'./assets/woool/maps/heaven_tower.jpg',bossName:'通天教主',bossSpriteKey:'sky_pontiff',
    bossHp:58000,bossDamage:81,chapterDifficulty:2.35,targetKills:1800,durationSeconds:600,
    ambientTheme:'embers',description:'穿过火烈鸟与两位使者的封锁，在九重云霄迎战通天教主。',
    opening: ['firebird', 'soul_envoy'],
    lordTypes: ['firebird', 'soul_envoy', 'flame_envoy'],
    monsterPool: [
      {typeId:'firebird', weight:30},
      {typeId:'soul_envoy', weight:25},
      {typeId:'flame_envoy', weight:23}
    ]
  }
};
