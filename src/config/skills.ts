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
    desc: '向近敌发射火球。',
    cooldown: 0.95,
    damage: 38,
    area: 45,
    range: 420,
    soundKey: 'skill_fireball',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '初凝真火', description: '向近敌发射火球。' },
      { level: 2, title: '连环飞火', description: '伤害提高，冷却缩短。' },
      { level: 3, title: '三昧真焰', description: '最多攻击 2 个目标，附加 2 秒灼烧。' },
      { level: 4, title: '【爆炎连珠】', description: '最多攻击 3 个目标，每颗必定暴击并溅射。' },
      { level: 5, title: '燎原', description: '爆炸会点燃周围敌人，持续 3 秒。' }
    ]
  },
  lightning_strike: {
    id: 'lightning_strike',
    name: '雷电术',
    classType: 'wizard',
    iconId: 2002,
    quality: 'rare',
    desc: '落雷麻痹目标 0.4 秒。',
    cooldown: 1.35,
    damage: 64,
    area: 60,
    range: 420,
    soundKey: 'skill_lightning',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '九天落雷', description: '落雷麻痹目标 0.4 秒。' },
      { level: 2, title: '狂雷震岳', description: '落雷伤害提高，冷却缩短。' },
      { level: 3, title: '双雷齐至', description: '最多 2 道落雷，麻痹延长至 0.8 秒。' },
      { level: 4, title: '【乾坤天劫】', description: '最多同时劈中 3 个目标。' },
      { level: 5, title: '雷印', description: '落雷为目标破甲，后续攻击增伤 30%。' }
    ]
  },
  hellfire: {
    id: 'hellfire',
    name: '地狱火',
    classType: 'wizard',
    iconId: 2007,
    quality: 'rare',
    desc: '火焰沿直线穿透敌人。',
    cooldown: 2.1,
    damage: 48,
    area: 130,
    range: 260,
    soundKey: 'skill_hellfire',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '烈火一线', description: '火焰沿直线穿透敌人。' },
      { level: 2, title: '炽焰延伸', description: '火道延长 80，命中伤害提高。' },
      { level: 3, title: '业火焚躯', description: '火道附带 3 秒灼烧。' },
      { level: 4, title: '【焚界炎龙】', description: '火道直击与持续灼烧再次增强。' },
      { level: 5, title: '双向火道', description: '火焰同时向身前和身后贯穿。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '地煞初雷', description: '周身爆发雷光，击退近敌。' },
      { level: 2, title: '九幽雷潮', description: '半径增大，冷却进一步缩短。' },
      { level: 3, title: '雷殛四方', description: '雷震造成 1.45 倍伤害，击退更远。' },
      { level: 4, title: '【万劫雷狱】', description: '雷区再扩大，命中附加 35% 易伤。' },
      { level: 5, title: '雷牢', description: '被震退的敌人额外定身 1 秒。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '风灵初聚', description: '护盾持续 5.5 秒，并击退周围敌人。' },
      { level: 2, title: '罡风护体', description: '护盾持续 6.3 秒，风浪伤害提高。' },
      { level: 3, title: '风暴旋涡', description: '护盾持续 7.1 秒，风浪半径扩大。' },
      { level: 4, title: '【极意风影】', description: '护盾持续 7.9 秒，减伤至少 46%。' },
      { level: 5, title: '风缚', description: '护盾击退敌人时附加 3 秒减速。' }
    ]
  },
  ice_roar: {
    id: 'ice_roar',
    name: '冰咆哮',
    classType: 'wizard',
    iconId: 2008,
    quality: 'mythic',
    desc: '范围冰爆，减速 2.2 秒。',
    cooldown: 3.2,
    damage: 85,
    area: 170,
    range: 380,
    soundKey: 'skill_iceroar',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '寒风呼啸', description: '范围冰爆，减速 2.2 秒。' },
      { level: 2, title: '极地玄冰', description: '冰爆半径与伤害提高。' },
      { level: 3, title: '绝对零度', description: '冰爆半径额外扩大 30%。' },
      { level: 4, title: '【九幽冰狱】', description: '减速持续 3.5 秒，额外定身 1.2 秒。' },
      { level: 5, title: '碎冰', description: '对已减速的敌人造成额外 60% 伤害。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '初悟紫电', description: '单道紫雷，附带局部震荡。' },
      { level: 2, title: '雷龙狂舞', description: '电弧额外跳向 1 个目标。' },
      { level: 3, title: '紫霄天罚', description: '最多 2 道紫雷，每道可连锁 2 次并麻痹。' },
      { level: 4, title: '【狂龙破天】', description: '最多 3 道紫雷，每道可连锁 3 次。' },
      { level: 5, title: '雷蚀', description: '紫雷的冲击波也能麻痹敌人。' }
    ]
  },
  celestial_meteor: {
    id: 'celestial_meteor',
    name: '流星火雨',
    classType: 'wizard',
    iconId: 2011,
    quality: 'legendary',
    desc: '召唤 1 颗陨石轰击怪群。',
    cooldown: 5.5,
    damage: 160,
    area: 240,
    range: 400,
    soundKey: 'skill_hellfire',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '天降炽流', description: '召唤 1 颗陨石轰击怪群。' },
      { level: 2, title: '炎浪滔天', description: '落下 2 颗陨石。' },
      { level: 3, title: '双星贯日', description: '落下 3 颗陨石，附加减速与灼烧。' },
      { level: 4, title: '【太古灭世】', description: '落下 5 颗陨石，扩大轰击范围。' },
      { level: 5, title: '天坠', description: '每颗陨石落地时震晕范围内敌人。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '刚劲初发', description: '朝近敌劈砍，击退前方敌群。' },
      { level: 2, title: '势大力沉', description: '击退距离由 45 增至 65。' },
      { level: 3, title: '刀光霍霍', description: '劈砍半径由 85 增至 120。' },
      { level: 4, title: '【破天一击】', description: '每次命中有 35% 概率造成 1.6 倍伤害。' },
      { level: 5, title: '回身斩', description: '攻杀剑术同时斩击身后扇区。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '破空剑气', description: '剑气贯穿前方直线上的敌人。' },
      { level: 2, title: '无视防御', description: '贯穿伤害提高，冷却缩短。' },
      { level: 3, title: '两刃齐飞', description: '剑气长度增加 30%。' },
      { level: 4, title: '【虚空穿影】', description: '剑气伤害进一步提高，出剑更快。' },
      { level: 5, title: '破甲剑气', description: '贯穿时破甲，后续攻击增伤 40%。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '月华初现', description: '挥出环形刀光，击退身边魔物。' },
      { level: 2, title: '圆月狂澜', description: '击退距离由 52 增至 75。' },
      { level: 3, title: '刀气破空', description: '刀光半径额外扩大 20%。' },
      { level: 4, title: '【满月斩魄】', description: '冷却额外缩短 28%，可连续清场。' },
      { level: 5, title: '月缚', description: '弯刀击退敌人后，使其减速 2 秒。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '神行突进', description: '向面朝方向突进 165，震晕落点近敌。' },
      { level: 2, title: '势不可挡', description: '突进距离增至 210。' },
      { level: 3, title: '破军狂踏', description: '落点震击半径增至 160。' },
      { level: 4, title: '【战神突斩】', description: '落点伤害额外提高 45%，无敌时间增至 0.7 秒。' },
      { level: 5, title: '战吼', description: '冲撞落点的敌人破甲，后续攻击增伤 35%。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '金身初铸', description: '护盾持续 4.5 秒，减伤 38%。' },
      { level: 2, title: '不动明王', description: '减伤 46%，受击时反伤。' },
      { level: 3, title: '金刚怒目', description: '减伤 54%，护盾持续 6.3 秒。' },
      { level: 4, title: '【罗汉不灭】', description: '减伤 62%，护盾持续 7.2 秒。' },
      { level: 5, title: '铁壁回春', description: '每次施放护体，恢复 6% 最大气血。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '真火燃刃', description: '烈火斩在目标附近爆发。' },
      { level: 2, title: '双烈火劲', description: '命中附带 3 秒灼烧。' },
      { level: 3, title: '烈焰焚八荒', description: '索敌距离增加 50，爆发半径增至 115。' },
      { level: 4, title: '【火神破天】', description: '爆发倍率由 1.45 增至 1.8。' },
      { level: 5, title: '引燃', description: '斩中已灼烧的敌人时额外造成 60% 伤害。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '雷霆初动', description: '雷剑震击目标周围，麻痹 1.2 秒。' },
      { level: 2, title: '金雷破空', description: '震击半径扩大 40%。' },
      { level: 3, title: '雷龙震天', description: '雷击伤害提高，冷却缩短。' },
      { level: 4, title: '【万剑归宗】', description: '雷击伤害再次提高，出剑更快。' },
      { level: 5, title: '雷锁', description: '定身结束后，目标仍受减速影响。' }
    ]
  },

  // ==========================================
  // --- 道士技能体系 (Taoist) ---
  // ==========================================
  soul_talisman: {
    id: 'soul_talisman',
    name: '灵魂火符',
    classType: 'taoist',
    iconId: 3002,
    quality: 'common',
    desc: '飞符锁定最近的 1 个目标。',
    cooldown: 1.05,
    damage: 42,
    area: 50,
    range: 440,
    soundKey: 'skill_talisman',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '飞符初成', description: '飞符锁定最近的 1 个目标。' },
      { level: 2, title: '朱雀灵火', description: '提高符伤并缩短冷却。' },
      { level: 3, title: '双符连发', description: '最多向 2 个目标发符。' },
      { level: 4, title: '【五岳神符】', description: '最多向 4 个目标发符，定身 1 秒。' },
      { level: 5, title: '镇魂', description: '命中的目标破甲，后续攻击增伤 30%。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '甘霖润体', description: '恢复 35 点气血。' },
      { level: 2, title: '慈航普渡', description: '每次恢复 55 点气血。' },
      { level: 3, title: '太清神愈', description: '回血 80，随从回满。' },
      { level: 4, title: '【枯木逢春】', description: '回血 110，冷却缩短。' },
      { level: 5, title: '护命', description: '治疗同时获得 1 秒无敌。' }
    ]
  },
  poison_cloud: {
    id: 'poison_cloud',
    name: '施毒术',
    classType: 'taoist',
    iconId: 3004,
    quality: 'rare',
    desc: '中毒 4 秒，易伤 20%。',
    cooldown: 3.2,
    damage: 32,
    area: 140,
    range: 350,
    soundKey: 'skill_poison',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '阴阳双毒', description: '中毒 4 秒，易伤 20%。' },
      { level: 2, title: '漫天毒瘴', description: '毒雾范围扩大，持续时间增至 6 秒。' },
      { level: 3, title: '蛊毒钻心', description: '直击和每次毒伤提高。' },
      { level: 4, title: '【万劫蛊王】', description: '易伤增至 45%，额外减速 4 秒。' },
      { level: 5, title: '蚀骨', description: '对已中毒的目标引爆一次毒伤。' }
    ]
  },
  summon_skeleton: {
    id: 'summon_skeleton',
    name: '召唤骷髅',
    classType: 'taoist',
    iconId: 3008,
    quality: 'rare',
    desc: '维持 1 具护卫骷髅。',
    cooldown: 5.5,
    damage: 36,
    area: 60,
    range: 480,
    soundKey: 'skill_shinsu',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '白骨复苏', description: '维持 1 具护卫骷髅。' },
      { level: 2, title: '骨铠强化', description: '护卫移动加快，斧击伤害提高。' },
      { level: 3, title: '双骨齐出', description: '最多维持 2 具护卫。' },
      { level: 4, title: '【百鬼行军】', description: '双护卫斧击伤害进一步提高。' },
      { level: 5, title: '白骨军阵', description: '护卫上限从 2 具增至 3 具。' }
    ]
  },
  ghost_fire_curse: {
    id: 'ghost_fire_curse',
    name: '幽冥火咒',
    classType: 'taoist',
    iconId: 3011,
    quality: 'epic',
    desc: '冥符锁定 1 个目标。',
    cooldown: 1.8,
    damage: 68,
    area: 95,
    range: 400,
    soundKey: 'skill_talisman',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '幽火化符', description: '冥符锁定 1 个目标。' },
      { level: 2, title: '冥符追魂', description: '最多攻击 2 个目标，附带溅射。' },
      { level: 3, title: '九幽摄魄', description: '最多攻击 3 个目标，并减速 1.5 秒。' },
      { level: 4, title: '【太极道煞】', description: '最多攻击 5 个目标。' },
      { level: 5, title: '鬼焰', description: '咒符爆炸会点燃周围敌人，持续 3 秒。' }
    ]
  },
  shinsu_summon: {
    id: 'shinsu_summon',
    name: '召唤神兽',
    classType: 'taoist',
    iconId: 3007,
    quality: 'mythic',
    desc: '神兽喷火，波及周围敌人。',
    cooldown: 6.5,
    damage: 75,
    area: 130,
    range: 480,
    soundKey: 'skill_shinsu',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '神兽降世', description: '神兽喷火，波及周围敌人。' },
      { level: 2, title: '神兽狂怒', description: '神兽吐息伤害提高。' },
      { level: 3, title: '圣兽烈阳', description: '神兽吐息伤害进一步提高。' },
      { level: 4, title: '【天尊金乌神兽】', description: '可同时召唤 2 只神兽。' },
      { level: 5, title: '远焰', description: '神兽在 180 距离内即可喷火。' }
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
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '通灵白骨', description: '维持 1 具强化骷髅。' },
      { level: 2, title: '双骨成阵', description: '最多 2 具强化骷髅，移动加快。' },
      { level: 3, title: '狂暴斧风', description: '强化骷髅斧击伤害提高。' },
      { level: 4, title: '【修罗双煞】', description: '最多 3 具强化骷髅。' },
      { level: 5, title: '碎甲战斧', description: '强化骷髅的主目标破甲，后续攻击增伤 35%。' }
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
    soundKey: 'skill_repel',
    maxLevel: 5,
    upgrades: [
      { level: 1, title: '佛门狮吼', description: '吼退周围敌人，定身 1.4 秒。' },
      { level: 2, title: '梵音灌顶', description: '吼声半径与伤害提高。' },
      { level: 3, title: '金狮真身', description: '扩大控制范围，冷却缩短。' },
      { level: 4, title: '【万佛朝宗】', description: '定身延长至 2.8 秒。' },
      { level: 5, title: '狮威', description: '怒吼命中时，每个敌人回复 2 气血，最多 24。' }
    ]
  }
};

export const WOOWL_PASSIVES: Record<string, PassiveDefinition> = {
  sacred_stone: {
    id: 'sacred_stone',
    name: '传世神兵玄晶',
    iconId: 2010210,
    iconType: 'item',
    desc: '每级伤害 +15%。',
    maxLevel: 4,
    effect: { damageMod: 0.15 }
  },
  wind_boots: {
    id: 'wind_boots',
    name: '风雷神行步',
    iconId: 2030410,
    iconType: 'item',
    desc: '每级移速 +15%。',
    maxLevel: 4,
    effect: { speedMod: 0.15 }
  },
  snow_lotus: {
    id: 'snow_lotus',
    name: '天山雪莲玉髓',
    iconId: 2030310,
    iconType: 'item',
    desc: '每级气血 +20%，每秒回血 +2。',
    maxLevel: 4,
    effect: { hpMod: 0.2, hpRegen: 2 }
  },
  abyss_orb: {
    id: 'abyss_orb',
    name: '深渊魔晶珠',
    iconId: 2020210,
    iconType: 'item',
    desc: '每级技能范围 +20%。',
    maxLevel: 4,
    effect: { areaMod: 0.2 }
  },
  taichi_pill: {
    id: 'taichi_pill',
    name: '太极洗髓金丹',
    iconId: 2030210,
    iconType: 'item',
    desc: '每级冷却 −12%。',
    maxLevel: 4,
    effect: { cooldownMod: -0.12 }
  },
  gravity_magnet: {
    id: 'gravity_magnet',
    name: '玛法乾坤引力石',
    iconId: 2030610,
    iconType: 'item',
    desc: '每级拾取距离 +40%。',
    maxLevel: 4,
    effect: { pickupRangeMod: 0.4 }
  }
};
