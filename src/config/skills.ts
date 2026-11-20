import type { SkillDefinition, PassiveDefinition } from '../types';

export const WOOWL_SKILLS: Record<string, SkillDefinition> = {
  // ==========================================
  // --- 法师技能体系 (Wizard) ---
  // ==========================================
  fireball: {
    id: 'fireball',
    name: '火球术',
    classType: 'wizard',
    iconId: 2001,
    quality: 'common',
    desc: '向最近目标释放 1 颗火球。',
    cooldown: 0.95,
    damage: 38,
    area: 45,
    range: 420,
    soundKey: 'skill_fireball',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '初凝真火', description: '向最近目标释放 1 颗火球。' },
      { level: 2, title: '连环飞火', description: '单发基础伤害提高，冷却缩短。' },
      { level: 3, title: '三昧真焰', description: '最多攻击 2 个目标，附加 2 秒灼烧。' },
      { level: 4, title: '【爆炎连珠·质变】', description: '最多攻击 3 个目标，每颗必定暴击并溅射。' }
    ]
  },
  lightning_strike: {
    id: 'lightning_strike',
    name: '雷电术',
    classType: 'wizard',
    iconId: 2005,
    quality: 'rare',
    desc: '单道落雷，麻痹 0.4 秒。',
    cooldown: 1.35,
    damage: 64,
    area: 60,
    range: 420,
    soundKey: 'skill_lightning',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '九天落雷', description: '单道落雷，麻痹 0.4 秒。' },
      { level: 2, title: '狂雷震岳', description: '落雷伤害提高，冷却缩短。' },
      { level: 3, title: '双雷齐至', description: '最多 2 道落雷，麻痹延长至 0.8 秒。' },
      { level: 4, title: '【乾坤天劫·质变】', description: '最多同时劈中 3 个目标。' }
    ]
  },
  hellfire: {
    id: 'hellfire',
    name: '地狱火',
    classType: 'wizard',
    iconId: 2004,
    quality: 'rare',
    desc: '向最近目标喷出直线穿透火焰。',
    cooldown: 2.1,
    damage: 48,
    area: 130,
    range: 260,
    soundKey: 'skill_firewall',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '烈火一线', description: '向最近目标喷出直线穿透火焰。' },
      { level: 2, title: '炽焰延伸', description: '火道延长 80，命中伤害提高。' },
      { level: 3, title: '业火焚躯', description: '火道附带 3 秒灼烧。' },
      { level: 4, title: '【焚界炎龙·质变】', description: '火道直击与持续灼烧再次增强。' }
    ]
  },
  hell_thunder: {
    id: 'hell_thunder',
    name: '地狱雷光',
    classType: 'wizard',
    iconId: 2003,
    quality: 'epic',
    desc: '周身爆发雷光，击退近敌。',
    cooldown: 2.8,
    damage: 65,
    area: 180,
    range: 0,
    soundKey: 'skill_hellthunder',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '地煞初雷', description: '周身爆发雷光，击退近敌。' },
      { level: 2, title: '九幽雷潮', description: '半径增大，冷却进一步缩短。' },
      { level: 3, title: '雷殛四方', description: '雷震造成 1.45 倍伤害，击退更远。' },
      { level: 4, title: '【万劫雷狱·质变】', description: '雷区再扩大，命中附加 35% 易伤。' }
    ]
  },
  wind_shield: {
    id: 'wind_shield',
    name: '风影盾',
    classType: 'wizard',
    iconId: 2009,
    quality: 'epic',
    desc: '护盾持续 5.5 秒，并击退周围敌人。',
    cooldown: 6.0,
    damage: 20,
    area: 120,
    range: 0,
    soundKey: 'skill_shield',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '风灵初聚', description: '护盾持续 5.5 秒，并击退周围敌人。' },
      { level: 2, title: '罡风护体', description: '护盾持续 6.3 秒，风浪伤害提高。' },
      { level: 3, title: '风暴旋涡', description: '护盾持续 7.1 秒，风浪半径扩大。' },
      { level: 4, title: '【极意风影·质变】', description: '护盾持续 7.9 秒，减伤至少 46%。' }
    ]
  },
  ice_roar: {
    id: 'ice_roar',
    name: '冰咆哮',
    classType: 'wizard',
    iconId: 2008,
    quality: 'mythic',
    desc: '冻结目标周围的空气，减速 2.2 秒。',
    cooldown: 3.2,
    damage: 85,
    area: 170,
    range: 380,
    soundKey: 'skill_iceroar',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '寒风呼啸', description: '冻结目标周围的空气，减速 2.2 秒。' },
      { level: 2, title: '极地玄冰', description: '冰爆半径与伤害提高。' },
      { level: 3, title: '绝对零度', description: '冰爆半径额外扩大 30%。' },
      { level: 4, title: '【九幽冰狱·质变】', description: '减速持续 3.5 秒，额外定身 1.2 秒。' }
    ]
  },
  dragon_purple_lightning: {
    id: 'dragon_purple_lightning',
    name: '狂龙紫电',
    classType: 'wizard',
    iconId: 2010,
    quality: 'legendary',
    desc: '单道紫雷，附带局部震荡。',
    cooldown: 1.8,
    damage: 120,
    area: 130,
    range: 460,
    soundKey: 'skill_lightning',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '初悟紫电', description: '单道紫雷，附带局部震荡。' },
      { level: 2, title: '雷龙狂舞', description: '电弧额外跳向 1 个目标。' },
      { level: 3, title: '紫霄天罚', description: '最多 2 道紫雷，每道可连锁 2 次并麻痹。' },
      { level: 4, title: '【狂龙破天·质变】', description: '最多 3 道紫雷，每道可连锁 3 次。' }
    ]
  },
  celestial_meteor: {
    id: 'celestial_meteor',
    name: '流星火雨',
    classType: 'wizard',
    iconId: 2202,
    quality: 'legendary',
    desc: '召唤 1 颗陨石轰击怪群。',
    cooldown: 5.5,
    damage: 160,
    area: 240,
    range: 400,
    soundKey: 'skill_hellfire',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '天降炽流', description: '召唤 1 颗陨石轰击怪群。' },
      { level: 2, title: '炎浪滔天', description: '落下 2 颗陨石。' },
      { level: 3, title: '双星贯日', description: '落下 3 颗陨石，附加减速与灼烧。' },
      { level: 4, title: '【太古灭世·质变】', description: '落下 5 颗陨石，扩大轰击范围。' }
    ]
  },

  // ==========================================
  // --- 战士技能体系 (Warrior) ---
  // ==========================================
  attack_slash: {
    id: 'attack_slash',
    name: '攻杀剑术',
    classType: 'warrior',
    iconId: 1002,
    quality: 'common',
    desc: '朝近敌劈砍，击退前方敌群。',
    cooldown: 1.05,
    damage: 45,
    area: 90,
    range: 95,
    soundKey: 'skill_slash',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '刚劲初发', description: '朝近敌劈砍，击退前方敌群。' },
      { level: 2, title: '势大力沉', description: '击退距离由 45 增至 65。' },
      { level: 3, title: '刀光霍霍', description: '劈砍半径由 85 增至 120。' },
      { level: 4, title: '【破天一击·质变】', description: '每次命中有 35% 概率造成 1.6 倍伤害。' }
    ]
  },
  assassination_sword: {
    id: 'assassination_sword',
    name: '刺杀剑术',
    classType: 'warrior',
    iconId: 1003,
    quality: 'rare',
    desc: '剑气贯穿前方直线上的敌人。',
    cooldown: 1.45,
    damage: 65,
    area: 80,
    range: 175,
    soundKey: 'skill_slash',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '破空剑气', description: '剑气贯穿前方直线上的敌人。' },
      { level: 2, title: '无视防御', description: '贯穿伤害提高，冷却缩短。' },
      { level: 3, title: '两刃齐飞', description: '剑气长度增加 30%。' },
      { level: 4, title: '【虚空穿影·质变】', description: '剑气伤害进一步提高，出剑更快。' }
    ]
  },
  moon_blade: {
    id: 'moon_blade',
    name: '抱月刀',
    classType: 'warrior',
    iconId: 1004,
    quality: 'epic',
    desc: '挥出环形刀光，击退身边魔物。',
    cooldown: 1.65,
    damage: 72,
    area: 145,
    range: 0,
    soundKey: 'skill_slash',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '月华初现', description: '挥出环形刀光，击退身边魔物。' },
      { level: 2, title: '圆月狂澜', description: '击退距离由 52 增至 75。' },
      { level: 3, title: '刀气破空', description: '刀光半径额外扩大 20%。' },
      { level: 4, title: '【满月斩魄·质变】', description: '冷却额外缩短 28%，可连续清场。' }
    ]
  },
  assault_dash: {
    id: 'assault_dash',
    name: '突斩',
    classType: 'warrior',
    iconId: 1010,
    quality: 'epic',
    desc: '向面朝方向突进 165，震晕落点近敌。',
    cooldown: 3.5,
    damage: 68,
    area: 110,
    range: 250,
    soundKey: 'skill_repel',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '神行突进', description: '向面朝方向突进 165，震晕落点近敌。' },
      { level: 2, title: '势不可挡', description: '突进距离增至 210。' },
      { level: 3, title: '破军狂踏', description: '落点震击半径增至 160。' },
      { level: 4, title: '【战神突斩·质变】', description: '落点伤害额外提高 45%，无敌时间增至 0.7 秒。' }
    ]
  },
  diamond_body: {
    id: 'diamond_body',
    name: '金刚护体',
    classType: 'warrior',
    iconId: 1008,
    quality: 'mythic',
    desc: '护盾持续 4.5 秒，减伤 38%。',
    cooldown: 8.0,
    damage: 32,
    area: 140,
    range: 0,
    soundKey: 'skill_holyword',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '金身初铸', description: '护盾持续 4.5 秒，减伤 38%。' },
      { level: 2, title: '不动明王', description: '减伤 46%，受击时反伤。' },
      { level: 3, title: '金刚怒目', description: '减伤 54%，护盾持续 6.3 秒。' },
      { level: 4, title: '【罗汉不灭·质变】', description: '减伤 62%，护盾持续 7.2 秒。' }
    ]
  },
  fire_sword: {
    id: 'fire_sword',
    name: '烈火剑法',
    classType: 'warrior',
    iconId: 1006,
    quality: 'mythic',
    desc: '烈火斩在目标附近爆发。',
    cooldown: 3.2,
    damage: 135,
    area: 105,
    range: 140,
    soundKey: 'skill_fireball',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '真火燃刃', description: '烈火斩在目标附近爆发。' },
      { level: 2, title: '双烈火劲', description: '命中附带 3 秒灼烧。' },
      { level: 3, title: '烈焰焚八荒', description: '索敌距离增加 50，爆发半径增至 115。' },
      { level: 4, title: '【火神破天·质变】', description: '爆发倍率由 1.45 增至 1.8。' }
    ]
  },
  thunder_sword: {
    id: 'thunder_sword',
    name: '雷霆剑法',
    classType: 'warrior',
    iconId: 1102,
    quality: 'legendary',
    desc: '雷剑震击目标周围，麻痹 1.2 秒。',
    cooldown: 4.8,
    damage: 175,
    area: 180,
    range: 240,
    soundKey: 'skill_lightning',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '雷霆初动', description: '雷剑震击目标周围，麻痹 1.2 秒。' },
      { level: 2, title: '金雷破空', description: '震击半径扩大 40%。' },
      { level: 3, title: '雷龙震天', description: '雷击伤害提高，冷却缩短。' },
      { level: 4, title: '【万剑归宗·质变】', description: '雷击伤害再次提高，出剑更快。' }
    ]
  },

  // ==========================================
  // --- 道士技能体系 (Taoist) ---
  // ==========================================
  soul_talisman: {
    id: 'soul_talisman',
    name: '灵魂火符',
    classType: 'taoist',
    iconId: 3011,
    quality: 'common',
    desc: '飞符锁定最近的 1 个目标。',
    cooldown: 1.05,
    damage: 42,
    area: 50,
    range: 440,
    soundKey: 'skill_talisman',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '飞符初成', description: '飞符锁定最近的 1 个目标。' },
      { level: 2, title: '朱雀灵火', description: '提高符伤并缩短冷却。' },
      { level: 3, title: '双符连发', description: '最多向 2 个目标发符。' },
      { level: 4, title: '【五岳神符·质变】', description: '最多向 4 个目标发符，定身 1 秒。' }
    ]
  },
  heal_spell: {
    id: 'heal_spell',
    name: '治愈术',
    classType: 'taoist',
    iconId: 3001,
    quality: 'common',
    desc: '恢复 35 点气血。',
    cooldown: 4.5,
    damage: 0,
    area: 0,
    range: 0,
    soundKey: 'skill_holyword',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '甘霖润体', description: '恢复 35 点气血。' },
      { level: 2, title: '慈航普渡', description: '每次恢复 55 点气血。' },
      { level: 3, title: '太清神愈', description: '每次恢复 80 点，随从回满生命。' },
      { level: 4, title: '【枯木逢春·质变】', description: '每次恢复 110 点，冷却进一步缩短。' }
    ]
  },
  poison_cloud: {
    id: 'poison_cloud',
    name: '施毒术',
    classType: 'taoist',
    iconId: 3004,
    quality: 'rare',
    desc: '毒雾持续 4 秒，附加持续伤害与 20% 易伤。',
    cooldown: 3.2,
    damage: 32,
    area: 140,
    range: 350,
    soundKey: 'skill_poison',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '阴阳双毒', description: '毒雾持续 4 秒，附加持续伤害与 20% 易伤。' },
      { level: 2, title: '漫天毒瘴', description: '毒雾范围扩大，持续时间增至 6 秒。' },
      { level: 3, title: '蛊毒钻心', description: '直击和每次毒伤提高。' },
      { level: 4, title: '【万劫蛊王·质变】', description: '易伤增至 45%，额外减速 4 秒。' }
    ]
  },
  summon_skeleton: {
    id: 'summon_skeleton',
    name: '召唤骷髅',
    classType: 'taoist',
    iconId: 3003,
    quality: 'rare',
    desc: '维持 1 具护卫骷髅。',
    cooldown: 5.5,
    damage: 36,
    area: 60,
    range: 480,
    soundKey: 'skill_shinsu',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '白骨复苏', description: '维持 1 具护卫骷髅。' },
      { level: 2, title: '骨铠强化', description: '护卫移动加快，斧击伤害提高。' },
      { level: 3, title: '双骨齐出', description: '最多维持 2 具护卫。' },
      { level: 4, title: '【百鬼行军·质变】', description: '双护卫斧击伤害进一步提高。' }
    ]
  },
  ghost_fire_curse: {
    id: 'ghost_fire_curse',
    name: '幽冥火咒',
    classType: 'taoist',
    iconId: 3008,
    quality: 'epic',
    desc: '冥符锁定 1 个目标。',
    cooldown: 1.8,
    damage: 68,
    area: 95,
    range: 400,
    soundKey: 'skill_talisman',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '幽火化符', description: '冥符锁定 1 个目标。' },
      { level: 2, title: '冥符追魂', description: '最多攻击 2 个目标，附带溅射。' },
      { level: 3, title: '九幽摄魄', description: '最多攻击 3 个目标，并减速 1.5 秒。' },
      { level: 4, title: '【太极道煞·质变】', description: '最多攻击 5 个目标，扩大溅射半径。' }
    ]
  },
  shinsu_summon: {
    id: 'shinsu_summon',
    name: '召唤神兽',
    classType: 'taoist',
    iconId: 3007,
    quality: 'mythic',
    desc: '召唤 1 只神兽，其火焰波及目标附近敌人。',
    cooldown: 6.5,
    damage: 75,
    area: 130,
    range: 480,
    soundKey: 'skill_shinsu',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '神兽降世', description: '召唤 1 只神兽，其火焰波及目标附近敌人。' },
      { level: 2, title: '神兽狂怒', description: '神兽吐息伤害提高。' },
      { level: 3, title: '圣兽烈阳', description: '神兽吐息伤害进一步提高。' },
      { level: 4, title: '【天尊金乌神兽·质变】', description: '可同时召唤 2 只神兽。' }
    ]
  },
  enhanced_skeleton: {
    id: 'enhanced_skeleton',
    name: '强化骷髅术',
    classType: 'taoist',
    iconId: 3012,
    quality: 'legendary',
    desc: '维持 1 具强化骷髅。',
    cooldown: 6.0,
    damage: 105,
    area: 85,
    range: 540,
    soundKey: 'skill_shinsu',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '通灵白骨', description: '维持 1 具强化骷髅。' },
      { level: 2, title: '双骨成阵', description: '最多 2 具强化骷髅，移动加快。' },
      { level: 3, title: '狂暴斧风', description: '强化骷髅斧击伤害提高。' },
      { level: 4, title: '【修罗双煞·质变】', description: '最多 3 具强化骷髅。' }
    ]
  },
  lion_roar: {
    id: 'lion_roar',
    name: '狮子吼',
    classType: 'taoist',
    iconId: 3303,
    quality: 'legendary',
    desc: '吼退周围敌人，定身 1.4 秒。',
    cooldown: 8.5,
    damage: 95,
    area: 250,
    range: 0,
    soundKey: 'skill_holyword',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '佛门狮吼', description: '吼退周围敌人，定身 1.4 秒。' },
      { level: 2, title: '梵音灌顶', description: '吼声半径与伤害提高。' },
      { level: 3, title: '金狮真身', description: '扩大控制范围，冷却缩短。' },
      { level: 4, title: '【万佛朝宗·质变】', description: '定身延长至 2.8 秒。' }
    ]
  }
};

export const WOOWL_PASSIVES: Record<string, PassiveDefinition> = {
  sacred_stone: {
    id: 'sacred_stone',
    name: '传世神兵玄晶',
    iconId: 2010210,
    iconType: 'item',
    desc: '淬炼上古黑水晶戒指精魄，提升所有招式技能威力与破坏力。',
    maxLevel: 4,
    effect: { damageMod: 0.15 }
  },
  wind_boots: {
    id: 'wind_boots',
    name: '风雷神行步',
    iconId: 2030410,
    iconType: 'item',
    desc: '装备传世鹿皮战靴，身若游龙，穿梭于千军万马，大幅提升移动速度。',
    maxLevel: 4,
    effect: { speedMod: 0.15 }
  },
  snow_lotus: {
    id: 'snow_lotus',
    name: '天山雪莲玉髓',
    iconId: 2030310,
    iconType: 'item',
    desc: '佩戴凤凰项链秘宝，大幅增加生命上限，并赋予源源不断的自然回血能力。',
    maxLevel: 4,
    effect: { hpMod: 0.2, hpRegen: 2 }
  },
  abyss_orb: {
    id: 'abyss_orb',
    name: '深渊魔晶珠',
    iconId: 2020210,
    iconType: 'item',
    desc: '镶嵌魔眼魔晶法戒，引聚天地灵气波纹，扩大所有技能的打击范围与影响范围。',
    maxLevel: 4,
    effect: { areaMod: 0.2 }
  },
  taichi_pill: {
    id: 'taichi_pill',
    name: '太极洗髓金丹',
    iconId: 2030210,
    iconType: 'item',
    desc: '通灵珍珠法戒之灵力，打通奇经八脉，气血流转神速，缩短所有招式冷却间隔。',
    maxLevel: 4,
    effect: { cooldownMod: -0.12 }
  },
  gravity_magnet: {
    id: 'gravity_magnet',
    name: '玛法乾坤引力石',
    iconId: 2030610,
    iconType: 'item',
    desc: '佩戴玛法金银手镯，内蕴乾坤磁场，大幅扩大战利品、金币与灵力结晶的磁吸距离。',
    maxLevel: 4,
    effect: { pickupRangeMod: 0.4 }
  }
};
