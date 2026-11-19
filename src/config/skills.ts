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
    desc: '法师入门经典法术！凝聚赤红真火向前掷出灼热火球，精准打击单体魔物。',
    cooldown: 0.95,
    damage: 38,
    area: 45,
    range: 420,
    soundKey: 'skill_fireball',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '初凝真火', description: '快速掷出火球轰击最近魔物，造成基础火系伤害。' },
      { level: 2, title: '连环飞火', description: '火球伤害提升35%，冷却缩短至0.8秒。' },
      { level: 3, title: '三昧真焰', description: '每次攻击额外射出第2颗连环火球，附带轻微灼烧。' },
      { level: 4, title: '【爆炎连珠·质变】', description: '三火连珠！火球暴击率提升40%，命中触发范围烈焰溅射！' }
    ]
  },
  lightning_strike: {
    id: 'lightning_strike',
    name: '雷电术',
    classType: 'wizard',
    iconId: 2005,
    quality: 'rare',
    desc: '传奇世界法师打宝PK核心招牌！沟通天地引九霄落雷直劈目标，附带麻痹震颤。',
    cooldown: 1.35,
    damage: 64,
    area: 60,
    range: 420,
    soundKey: 'skill_lightning',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '九天落雷', description: '引落一道天雷贯顶劈向敌人，附带0.4秒麻痹僵直。' },
      { level: 2, title: '狂雷震岳', description: '落雷伤害提升40%，受击魔物破甲20%。' },
      { level: 3, title: '双雷齐至', description: '落雷数量增至2道，麻痹时间延长至0.8秒。' },
      { level: 4, title: '【乾坤天劫·质变】', description: '天威降世！连续劈落3道狂暴天雷并引爆地面雷池！' }
    ]
  },
  hellfire: {
    id: 'hellfire',
    name: '地狱火',
    classType: 'wizard',
    iconId: 2004,
    quality: 'rare',
    desc: '催动丹田真火向前喷射一线烈焰火墙，穿透前方直线所有沿途魔物。',
    cooldown: 2.1,
    damage: 48,
    area: 130,
    range: 260,
    soundKey: 'skill_firewall',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '烈火一线', description: '向前喷涌一道直线火焰，穿透前方直线敌群。' },
      { level: 2, title: '炽焰延伸', description: '喷射距离延长35%，伤害提高35%。' },
      { level: 3, title: '业火焚躯', description: '穿透伤害附带3秒地狱灼烧，持续扣血。' },
      { level: 4, title: '【焚界炎龙·质变】', description: '向前方连续扇形喷出三道火龙，灼烧全屏直线通道！' }
    ]
  },
  hell_thunder: {
    id: 'hell_thunder',
    name: '地狱雷光',
    classType: 'wizard',
    iconId: 2003,
    quality: 'epic',
    desc: '以施法者自身为核心爆发狂暴环形雷暴，瞬间重创贴身围困的所有魔物。',
    cooldown: 2.8,
    damage: 65,
    area: 180,
    range: 0,
    soundKey: 'skill_hellthunder',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '地煞初雷', description: '爆发一圈雷电冲击波，击退贴身怪物。' },
      { level: 2, title: '九幽雷潮', description: '范围扩大30%，伤害提升30%，冷却缩减0.4秒。' },
      { level: 3, title: '雷殛四方', description: '连续爆发两段环形雷暴，击退幅度加倍。' },
      { level: 4, title: '【万劫雷狱·质变】', description: '雷狱永固！雷暴范围扩大50%，受击魔物防御清零！' }
    ]
  },
  wind_shield: {
    id: 'wind_shield',
    name: '风影盾',
    classType: 'wizard',
    iconId: 2009,
    quality: 'epic',
    desc: '唤起呼啸护体风灵力场，大幅提升敏捷闪避与移动速度，受击时气旋推开敌人。',
    cooldown: 6.0,
    damage: 20,
    area: 120,
    range: 0,
    soundKey: 'skill_shield',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '风灵初聚', description: '移动速度提高25%，受击时爆发风浪击退身边魔物。' },
      { level: 2, title: '罡风护体', description: '移动速度提升至35%，获得20%伤害减免。' },
      { level: 3, title: '风暴旋涡', description: '自身周围形成常驻风刃切割力场，每0.5秒刮伤周围敌人。' },
      { level: 4, title: '【极意风影·质变】', description: '踏风无痕！闪避率提升至50%，护盾破碎时全屏狂风刮飞全场魔物！' }
    ]
  },
  ice_roar: {
    id: 'ice_roar',
    name: '冰咆哮',
    classType: 'wizard',
    iconId: 2008,
    quality: 'mythic',
    desc: '在魔物群中唤起呼啸盘旋的暴风雪龙卷风，强力冰冻并绞碎范围内的敌人。',
    cooldown: 3.2,
    damage: 85,
    area: 170,
    range: 380,
    soundKey: 'skill_iceroar',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '寒风呼啸', description: '召唤旋转暴风雪，减速魔物45%并造成持续冰霜伤害。' },
      { level: 2, title: '极地玄冰', description: '暴风雪范围扩大25%，伤害提高35%，冰冻概率提升。' },
      { level: 3, title: '绝对零度', description: '暴风雪中心引发二次冰爆，重度减速所有受击敌人。' },
      { level: 4, title: '【九幽冰狱·质变】', description: '全图极寒暴风雪降临！受击魔物被彻底冰冻定身1.5秒并附带易伤！' }
    ]
  },
  dragon_purple_lightning: {
    id: 'dragon_purple_lightning',
    name: '狂龙紫电',
    classType: 'wizard',
    iconId: 2010,
    quality: 'legendary',
    desc: '传奇世界法师终极奥义！引九天紫霄狂雷贯穿苍穹，产生剧烈雷暴轰炸与连锁电弧。',
    cooldown: 1.8,
    damage: 120,
    area: 130,
    range: 460,
    soundKey: 'skill_lightning',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '初悟紫电', description: '招引单道狂暴紫雷精准轰杀最近魔物，造成毁灭雷伤。' },
      { level: 2, title: '雷龙狂舞', description: '伤害提升35%，狂雷炸裂附带小范围震荡波并向周围1个目标跳跃。' },
      { level: 3, title: '紫霄天罚', description: '伤害提升40%，降雷增至2道且电弧跳跃2个目标，麻痹魔物0.8秒。' },
      { level: 4, title: '【狂龙破天·质变】', description: '天降狂暴紫雷阵！全屏3道轰顶狂雷+3重跳跃电弧，消灭敌人引爆雷环！' }
    ]
  },
  celestial_meteor: {
    id: 'celestial_meteor',
    name: '流星火雨',
    classType: 'wizard',
    iconId: 2202,
    quality: 'legendary',
    desc: '法神至高禁咒！沟通域外星辰引落焚界巨型陨石暴雨，造成毁天灭地的连续爆轰！',
    cooldown: 5.5,
    damage: 160,
    area: 240,
    range: 400,
    soundKey: 'skill_hellfire',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '天降炽流', description: '引落密集金色陨石，轰击地面造成巨额爆炸与灼烧。' },
      { level: 2, title: '炎浪滔天', description: '落点引发大范围金色冲击波，火海持续时间增加2秒。' },
      { level: 3, title: '双星贯日', description: '连续坠落多颗陨石，暴击伤害提升50%。' },
      { level: 4, title: '【太古灭世·质变】', description: '5颗超巨灭世陨石连续轰砸！秒杀全场小怪并留下地心熔岩！' }
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
    desc: '战士基础蓄力破甲斩！战刃泛起银白锋芒，以霸道劲力劈砍前方近身敌怪。',
    cooldown: 1.05,
    damage: 45,
    area: 90,
    range: 95,
    soundKey: 'skill_slash',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '刚劲初发', description: '向前劈出迅捷重斩，破开近身敌人防御。' },
      { level: 2, title: '势大力沉', description: '伤害提升35%，击退距离增加20px。' },
      { level: 3, title: '刀光霍霍', description: '挥剑产生小幅剑风，对周围半圆内敌人均造成伤害。' },
      { level: 4, title: '【破天一击·质变】', description: '每第3刀必定暴击并造成100%击退与破甲35%！' }
    ]
  },
  assassination_sword: {
    id: 'assassination_sword',
    name: '刺杀剑术',
    classType: 'warrior',
    iconId: 1003,
    quality: 'rare',
    desc: '凌厉剑气破空而出！无视目标防御直接穿透直线两格范围内所有魔物。',
    cooldown: 1.45,
    damage: 65,
    area: 80,
    range: 175,
    soundKey: 'skill_slash',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '破空剑气', description: '刺出锋利直线剑气，穿透直线上的所有魔物。' },
      { level: 2, title: '无视防御', description: '剑气伤害提升35%，完全无视目标护甲减免。' },
      { level: 3, title: '两刃齐飞', description: '刺杀射程扩大30%，每次刺杀甩出双道平行剑芒。' },
      { level: 4, title: '【虚空穿影·质变】', description: '剑气化为金色贯穿神刃！暴击伤害翻倍且击杀目标立即刷新冷却！' }
    ]
  },
  moon_blade: {
    id: 'moon_blade',
    name: '抱月刀',
    classType: 'warrior',
    iconId: 1004,
    quality: 'epic',
    desc: '传奇世界战士核心清怪绝学！挥刀狂旋360度释放半月弧光刀气，斩杀四面合围的敌群。',
    cooldown: 1.65,
    damage: 72,
    area: 145,
    range: 0,
    soundKey: 'skill_slash',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '月华初现', description: '挥刀360度环切，横扫身边所有魔物。' },
      { level: 2, title: '圆月狂澜', description: '刀气范围扩大25%，伤害提高35%，击退效果强化。' },
      { level: 3, title: '刀气破空', description: '每次抱月斩额外甩出4道向外扩散的飞刀气。' },
      { level: 4, title: '【满月斩魄·质变】', description: '化身无坚不摧的人肉龙卷！抱月刀气持续常驻高速双旋斩！' }
    ]
  },
  assault_dash: {
    id: 'assault_dash',
    name: '突斩',
    classType: 'warrior',
    iconId: 1010,
    quality: 'epic',
    desc: '传世战神霸道绝伦的冲锋位移！向前狂猛冲撞推土机般推挤并碾碎前方所有敌人。',
    cooldown: 3.5,
    damage: 68,
    area: 110,
    range: 250,
    soundKey: 'skill_repel',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '神行突进', description: '朝面朝方向高速突进，撞晕沿途魔物。' },
      { level: 2, title: '势不可挡', description: '冲刺距离增加30%，撞击附带碎石暴击伤害。' },
      { level: 3, title: '破军狂踏', description: '冲刺终点震击地面引发大地撕裂震荡波。' },
      { level: 4, title: '【战神突斩·质变】', description: '连续无缝双重突斩！冲刺期间全程绝对无敌且伤害提升100%！' }
    ]
  },
  diamond_body: {
    id: 'diamond_body',
    name: '金刚护体',
    classType: 'warrior',
    iconId: 1008,
    quality: 'mythic',
    desc: '运集全身气血凝聚不灭金刚佛光，获得巨额免伤与受击狂暴荆棘反弹。',
    cooldown: 8.0,
    damage: 32,
    area: 140,
    range: 0,
    soundKey: 'skill_holyword',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '金身初铸', description: '开启持续4秒金光护盾，受击伤害减少40%。' },
      { level: 2, title: '不动明王', description: '持续时间延长至6秒，受击时反弹50%伤害给近战攻击者。' },
      { level: 3, title: '金刚怒目', description: '免伤提升至60%，护体期间自身攻击力提高35%。' },
      { level: 4, title: '【罗汉不灭·质变】', description: '常驻金身金光！每消灭10只怪永久增加1点最大生命！' }
    ]
  },
  fire_sword: {
    id: 'fire_sword',
    name: '烈火剑法',
    classType: 'warrior',
    iconId: 1006,
    quality: 'mythic',
    desc: '引火元素于剑刃之上，挥出毁天灭地的纯阳火剑气，直取妖魔首级。',
    cooldown: 3.2,
    damage: 135,
    area: 105,
    range: 140,
    soundKey: 'skill_fireball',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '真火燃刃', description: '朝前方扇形挥出一道炽烈烈火重击。' },
      { level: 2, title: '双烈火劲', description: '伤害提升40%，附带强力点燃灼烧效果。' },
      { level: 3, title: '烈焰焚八荒', description: '烈火剑气延伸为巨大十字火焰斩。' },
      { level: 4, title: '【火神破天·质变】', description: '烈火暴击率达到100%！被击败的目标产生大爆炸连环引燃！' }
    ]
  },
  thunder_sword: {
    id: 'thunder_sword',
    name: '雷霆剑法',
    classType: 'warrior',
    iconId: 1102,
    quality: 'legendary',
    desc: '武圣无上剑意！引九天金雷贯入战刃，斩出撕裂天地的狂暴雷光金刃！',
    cooldown: 4.8,
    damage: 175,
    area: 180,
    range: 240,
    soundKey: 'skill_lightning',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '雷霆初动', description: '劈出一道贯穿雷霆战刃，斩裂前方直线敌人。' },
      { level: 2, title: '金雷破空', description: '剑刃宽度扩大50%，附带麻痹敌人1秒。' },
      { level: 3, title: '雷龙震天', description: '剑气命中魔物分裂出两道旋转雷光旋风。' },
      { level: 4, title: '【万剑归宗·质变】', description: '雷霆金剑如暴雨般从天而降，轰平全场所有妖魔！' }
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
    desc: '道士入门攻击道术！运转道气掷出朱砂灵符，凌空飞射命中产生爆裂灵火。',
    cooldown: 1.05,
    damage: 42,
    area: 50,
    range: 440,
    soundKey: 'skill_talisman',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '飞符初成', description: '掷出1道朱砂火符打击最近魔物。' },
      { level: 2, title: '朱雀灵火', description: '伤害提升35%，火符飞速加快。' },
      { level: 3, title: '双符连发', description: '每次攻击连掷2道灵符，命中产生范围灵力震荡。' },
      { level: 4, title: '【五岳神符·质变】', description: '4符齐发！受击魔物被封印行动力1秒并造成双倍灵伤！' }
    ]
  },
  heal_spell: {
    id: 'heal_spell',
    name: '治愈术',
    classType: 'taoist',
    iconId: 3001,
    quality: 'common',
    desc: '道门玄功济世救人！召唤九天圣洁甘霖沐浴周身，恢复自身气血。',
    cooldown: 4.5,
    damage: 0,
    area: 0,
    range: 0,
    soundKey: 'skill_holyword',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '甘霖润体', description: '为自身恢复35点气血。' },
      { level: 2, title: '慈航普渡', description: '恢复量提升至55点，冷却缩短至4.0秒。' },
      { level: 3, title: '太清神愈', description: '恢复量提升至80点，同时为所有随从回满生命！' },
      { level: 4, title: '【枯木逢春·质变】', description: '获得常驻每秒5点气血恢复，且受到致死伤害时金蝉脱壳免死一次！' }
    ]
  },
  poison_cloud: {
    id: 'poison_cloud',
    name: '施毒术',
    classType: 'taoist',
    iconId: 3004,
    quality: 'rare',
    desc: '提炼红绿双色秘制奇毒，绿毒噬肉腐血，红毒蚀骨破防。',
    cooldown: 3.2,
    damage: 32,
    area: 140,
    range: 350,
    soundKey: 'skill_poison',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '阴阳双毒', description: '向怪群泼洒毒雾，附带持续扣血与防御降低20%。' },
      { level: 2, title: '漫天毒瘴', description: '毒雾范围扩大35%，持续时间延长至6秒。' },
      { level: 3, title: '蛊毒钻心', description: '中毒敌人死亡时爆出剧毒尸爆，传染周围敌群。' },
      { level: 4, title: '【万劫蛊王·质变】', description: '毒云全图扩散！中毒魔物移速降低50%，受到所有伤害翻倍！' }
    ]
  },
  summon_skeleton: {
    id: 'summon_skeleton',
    name: '召唤骷髅',
    classType: 'taoist',
    iconId: 3003,
    quality: 'rare',
    desc: '以道家通灵法符役使地底白骨骷髅，忠诚护卫在道尊身旁，自动索敌近身砍杀。',
    cooldown: 5.5,
    damage: 36,
    area: 60,
    range: 480,
    soundKey: 'skill_shinsu',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '白骨复苏', description: '召唤1具白骨骷髅侍卫近身迎击敌怪。' },
      { level: 2, title: '骨铠强化', description: '骷髅生命提升50%，攻击附带轻微击退。' },
      { level: 3, title: '双骨齐出', description: '骷髅数量增加至2具！' },
      { level: 4, title: '【百鬼行军·质变】', description: '骷髅狂暴攻速翻倍！骷髅消灭魔物自动为主人回复生命！' }
    ]
  },
  ghost_fire_curse: {
    id: 'ghost_fire_curse',
    name: '幽冥火咒',
    classType: 'taoist',
    iconId: 3008,
    quality: 'epic',
    desc: '道家天机秘术，唤出幽蓝摄魄的冥火神符，回旋飞舞后锁敌轰杀。',
    cooldown: 1.8,
    damage: 68,
    area: 95,
    range: 400,
    soundKey: 'skill_talisman',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '幽火化符', description: '投掷1道旋转幽冥火符，自动追踪最近敌人造成单体轰杀。' },
      { level: 2, title: '冥符追魂', description: '火符数量增至2道，命中附带小范围幽火溅射。' },
      { level: 3, title: '九幽摄魄', description: '火符数量增至3道，伤害提升40%，受击魔物被幽冥寒气减速。' },
      { level: 4, title: '【太极道煞·质变】', description: '5符连环齐发！幽火命中魔物后分裂为无数幽冥火苗二次爆裂！' }
    ]
  },
  shinsu_summon: {
    id: 'shinsu_summon',
    name: '召唤神兽',
    classType: 'taoist',
    iconId: 3007,
    quality: 'mythic',
    desc: '沟通上古神境召唤赤焰麒麟圣兽，吐出炽烈龙炎喷射扇形敌群。',
    cooldown: 6.5,
    damage: 75,
    area: 130,
    range: 480,
    soundKey: 'skill_shinsu',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '神兽降世', description: '召唤1只喷火神兽护体，神兽吐出烈火横扫前方。' },
      { level: 2, title: '神兽狂怒', description: '神兽血量增加100%，龙炎喷射射程延长40%。' },
      { level: 3, title: '圣兽烈阳', description: '神兽普通攻击附带击退，吐息造成持续地面火线。' },
      { level: 4, title: '【天尊金乌神兽·质变】', description: '晋升为金色麒麟巨神兽！周期性召唤天火流星辅助主人！' }
    ]
  },
  enhanced_skeleton: {
    id: 'enhanced_skeleton',
    name: '强化骷髅术',
    classType: 'taoist',
    iconId: 3012,
    quality: 'legendary',
    desc: '传世道士终极招牌绝技！召唤手持双柄巨板斧的狂暴强化战神骷髅，双斧劈山斩岳！',
    cooldown: 6.0,
    damage: 105,
    area: 85,
    range: 540,
    soundKey: 'skill_shinsu',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '通灵白骨', description: '召唤1具强化双斧战神白骨侍卫，自主索敌劈杀。' },
      { level: 2, title: '双骨成阵', description: '同时召唤2具强化骷髅！侍卫移动速度提高30%。' },
      { level: 3, title: '狂暴斧风', description: '强化骷髅攻击伤害提升50%，攻速提升50%。' },
      { level: 4, title: '【修罗双煞·质变】', description: '骷髅增至3具修罗巨灵！攻击附带吸血并为道士主人分担50%伤害！' }
    ]
  },
  lion_roar: {
    id: 'lion_roar',
    name: '狮子吼',
    classType: 'taoist',
    iconId: 3303,
    quality: 'legendary',
    desc: '天尊梵音狮子吼！一吼震撼万古乾坤，震碎周围一切魔物心胆，全图麻痹定身！',
    cooldown: 8.5,
    damage: 95,
    area: 250,
    range: 0,
    soundKey: 'skill_holyword',
    maxLevel: 4,
    upgrades: [
      { level: 1, title: '佛门狮吼', description: '震吼波击退周围魔物，定身定魄1.2秒。' },
      { level: 2, title: '梵音灌顶', description: '范围扩大35%，吼伤魔物造成护甲破碎40%。' },
      { level: 3, title: '金狮真身', description: '召唤太古金狮虚影咆哮，全场魔物陷入混乱互相攻击！' },
      { level: 4, title: '【万佛朝宗·质变】', description: '天尊梵音洗涤苍生！定身全屏怪物3秒并造成巨额无视防御神圣伤害！' }
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
