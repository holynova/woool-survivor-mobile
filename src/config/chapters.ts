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
    description: '传世勇士启航之海岛原野，桃花灼灼，碧波微漾。广袤绿茵旷野间，稻草人、角鹿与毒蟒自远方林野蜂拥合围！',
    monsterPool: [
      { typeId: 'scarecrow', weight: 35 },
      { typeId: 'deer', weight: 25 },
      { typeId: 'snake', weight: 25 },
      { typeId: 'blade_hound', weight: 10 },
      { typeId: 'skeleton', weight: 5 }
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
    description: '中州皇城郊外的古代军道与广袤平原，视野开阔，红野猪、妖化刀犬与骷髅先锋潮水般直扑古战道！',
    monsterPool: [
      { typeId: 'wild_boar', weight: 30 },
      { typeId: 'blade_hound', weight: 25 },
      { typeId: 'skeleton', weight: 25 },
      { typeId: 'snake', weight: 10 },
      { typeId: 'enhanced_skeleton', weight: 10 }
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
    description: '大漠绝地中的辽阔戈壁与残破石刻古迹，广阔沙原一望无际，狂暴风沙中双斧骷髅将与赤炎兽傀儡全面苏醒！',
    monsterPool: [
      { typeId: 'blade_hound', weight: 25 },
      { typeId: 'skeleton', weight: 25 },
      { typeId: 'wild_boar', weight: 20 },
      { typeId: 'enhanced_skeleton', weight: 20 },
      { typeId: 'shinsu_puppet', weight: 10 }
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
    description: '沉没于千年毒瘴的幽暗沼泽湿地，暗绿鬼火闪烁，毒蛇与亡灵骷髅大军踏过开阔木栈泥沼合围而来！',
    monsterPool: [
      { typeId: 'snake', weight: 35 },
      { typeId: 'blade_hound', weight: 20 },
      { typeId: 'skeleton', weight: 25 },
      { typeId: 'enhanced_skeleton', weight: 15 },
      { typeId: 'shinsu_puppet', weight: 5 }
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
    description: '极北冰原的苍月辽阔雪地，积雪冰川与寒冰符石散落，重甲精锐兽傀儡与妖化兽群在茫茫冰原疯狂冲击！',
    monsterPool: [
      { typeId: 'snake', weight: 15 },
      { typeId: 'blade_hound', weight: 25 },
      { typeId: 'wild_boar', weight: 25 },
      { typeId: 'enhanced_skeleton', weight: 25 },
      { typeId: 'shinsu_puppet', weight: 10 }
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
    description: '终焉魔界深处的黑曜石熔岩开阔荒原，岩浆漫流、锁链横陈，唯有登峰造极的传世宗师方能在此迎战灭世魔君！',
    monsterPool: [
      { typeId: 'blade_hound', weight: 30 },
      { typeId: 'wild_boar', weight: 25 },
      { typeId: 'skeleton', weight: 25 },
      { typeId: 'enhanced_skeleton', weight: 15 },
      { typeId: 'shinsu_puppet', weight: 5 }
    ]
  }
};
