import type {
  DifficultyCurveDefinition,
  DifficultyCurveId,
  MonsterArchetype
} from '../types';

export const WOOWL_MONSTERS: Record<string, MonsterArchetype> = {
  scarecrow: {
    id: 'scarecrow',
    name: '稻草人',
    hp: 90,
    speed: 85, // Swarming meat shield
    damage: 14,
    exp: 4,
    radius: 24,
    spriteKey: '20112'
  },
  deer: {
    id: 'deer',
    name: '狂暴角鹿',
    hp: 88,
    speed: 140, // Fast charger
    damage: 16,
    exp: 5,
    radius: 24,
    spriteKey: '20072'
  },
  snake: {
    id: 'snake',
    name: '剧毒蟒蛇',
    hp: 60,
    speed: 195, // Ultra-fast slitherer snapping at player's heels
    damage: 18,
    exp: 4,
    radius: 20,
    spriteKey: '20038'
  },
  wild_boar: {
    id: 'wild_boar',
    name: '红野猪',
    hp: 210,
    speed: 128, // Heavy charger
    damage: 22,
    exp: 7,
    radius: 26,
    spriteKey: '20046'
  },
  blade_hound: {
    id: 'blade_hound',
    name: '妖化刀犬',
    hp: 155,
    speed: 185, // Fast flanking predator
    damage: 22,
    exp: 6,
    radius: 25,
    spriteKey: '20111'
  },
  skeleton: {
    id: 'skeleton',
    name: '白骨骷髅',
    hp: 280,
    speed: 105, // Relentless marching horde
    damage: 25,
    exp: 9,
    radius: 27,
    spriteKey: '20081'
  },
  enhanced_skeleton: {
    id: 'enhanced_skeleton',
    name: '双斧骷髅将',
    hp: 500,
    speed: 100, // Tanky dual axe warrior with dash bursts
    damage: 32,
    exp: 18,
    radius: 30,
    spriteKey: '20082'
  },
  shinsu_puppet: {
    id: 'shinsu_puppet',
    name: '赤炎兽傀儡',
    hp: 800,
    speed: 80, // Colossal tank
    damage: 40,
    exp: 28,
    radius: 34,
    spriteKey: '20085'
  }
};

export const WOOWL_DIFFICULTY_CURVES: Record<DifficultyCurveId, DifficultyCurveDefinition> = {
  casual: {
    id: 'casual',
    name: '逍遥割草',
    badge: '爽刷流',
    summary: '怪多血少，升级更快。',
    hpMult: 0.72,
    dmgMult: 0.62,
    speedMult: 0.94,
    densityMult: 1.45,
    expMult: 1.35,
    cdMult: 0.84,
    eliteInterval: 30,
    bossTimeScale: 0.90,
    bossHpMult: 0.85,
    bossDmgMult: 0.75
  },
  standard: {
    id: 'standard',
    name: '中州正统',
    badge: '推荐',
    summary: '标准怪潮，逐波增强。',
    hpMult: 1.15,
    dmgMult: 1.12,
    speedMult: 1.08,
    densityMult: 1.25,
    expMult: 1.12,
    cdMult: 0.96,
    eliteInterval: 22,
    bossTimeScale: 1.0,
    bossHpMult: 1.30,
    bossDmgMult: 1.20
  },
  surge: {
    id: 'surge',
    name: '狂潮骤变',
    badge: '暴走潮汐',
    summary: '怪群更密，精英更频繁。',
    hpMult: 1.25,
    dmgMult: 1.40,
    speedMult: 1.24,
    densityMult: 1.85,
    expMult: 1.25,
    cdMult: 0.88,
    eliteInterval: 16,
    bossTimeScale: 1.0,
    bossHpMult: 1.65,
    bossDmgMult: 1.40
  },
  hell: {
    id: 'hell',
    name: '铁血炼狱',
    badge: '硬核挑战',
    summary: '怪物血厚攻高，首领提前出现。',
    hpMult: 1.65,
    dmgMult: 1.60,
    speedMult: 1.28,
    densityMult: 1.55,
    expMult: 1.15,
    cdMult: 0.98,
    eliteInterval: 16,
    bossTimeScale: 0.95,
    bossHpMult: 1.95,
    bossDmgMult: 1.65
  }
};

export interface CurveRuntimeSnapshot {
  phaseIndex: number;
  phaseName: string;
  targetCount: number;
  spawnChancePerSec: number;
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  expBonusFlat: number;
  progress: number;
}

/**
 * Computes instantaneous wave density, enemy stat scaling, and phase labels
 * for the selected difficulty curve at a given match elapsed time.
 */
export function evaluateCurveState(
  curveId: DifficultyCurveId,
  chapterDifficulty: number,
  elapsed: number,
  bossTime: number
): CurveRuntimeSnapshot {
  const curve = WOOWL_DIFFICULTY_CURVES[curveId] || WOOWL_DIFFICULTY_CURVES.standard;
  const p = Math.max(0, Math.min(1.5, elapsed / Math.max(30, bossTime)));

  let waveDensityFactor = 1.0;
  let waveHpFactor = 1.0;
  let waveSpeedFactor = 1.0;
  let phaseIndex = 1;
  let phaseName = '初探境域';
  let expBonusFlat = 0;

  if (curveId === 'casual') {
    phaseIndex = p < 0.35 ? 1 : p < 0.75 ? 2 : p < 1.0 ? 3 : 4;
    phaseName = phaseIndex === 1
      ? '轻装热身'
      : phaseIndex === 2
        ? '群怪聚拢'
        : phaseIndex === 3
          ? '爽快割草'
          : '魔主现身';
    waveDensityFactor = 0.85 + p * 0.9;
    waveHpFactor = 0.8 + p * 0.45;
    waveSpeedFactor = 0.94 + p * 0.08;
    expBonusFlat = p < 0.35 ? 1 : 0;
  } else if (curveId === 'surge') {
    const pulse = 0.30 * Math.max(0, Math.sin((elapsed / 16) * Math.PI * 2));
    phaseIndex = p < 0.25 ? 1 : p < 0.6 ? 2 : p < 1.0 ? 3 : 4;
    phaseName = phaseIndex === 1
      ? '先遣奇袭'
      : phaseIndex === 2
        ? '狂潮涌动'
        : phaseIndex === 3
          ? '末日尸海'
          : '暴走魔主';
    waveDensityFactor = 0.80 + Math.pow(p, 1.1) * 1.25 + pulse;
    waveHpFactor = 0.84 + Math.pow(p, 1.35) * 0.95;
    waveSpeedFactor = 0.98 + p * 0.16;
    expBonusFlat = p < 0.25 ? 1 : 0;
  } else if (curveId === 'hell') {
    const saw = (p * 4) % 1;
    phaseIndex = p < 0.22 ? 1 : p < 0.55 ? 2 : p < 1.0 ? 3 : 4;
    phaseName = phaseIndex === 1
      ? '血战序幕'
      : phaseIndex === 2
        ? '魔军围剿'
        : phaseIndex === 3
          ? '炼狱绝境'
          : '绝望魔主';
    waveDensityFactor = 0.78 + p * 0.95 + (saw > 0.62 ? 0.32 : 0);
    waveHpFactor = 0.88 + Math.pow(p, 1.2) * 1.15;
    waveSpeedFactor = 1.0 + p * 0.18;
  } else {
    // 'standard': Classic 5-stage Sawtooth curve (Warmup -> Tide 1 -> Respite -> Tide 2 -> Boss)
    if (p < 0.22) {
      phaseIndex = 1;
      phaseName = '发育起势';
      waveDensityFactor = 0.62 + (p / 0.22) * 0.42;
      waveHpFactor = 0.78 + p * 0.5;
      waveSpeedFactor = 0.95;
      expBonusFlat = 1;
    } else if (p < 0.46) {
      phaseIndex = 2;
      phaseName = '第一波兽潮';
      waveDensityFactor = 1.42;
      waveHpFactor = 0.98 + (p - 0.22) * 0.6;
      waveSpeedFactor = 1.06;
    } else if (p < 0.60) {
      phaseIndex = 3;
      phaseName = '整备收割';
      waveDensityFactor = 0.75;
      waveHpFactor = 1.10;
      waveSpeedFactor = 0.98;
    } else if (p < 1.0) {
      phaseIndex = 4;
      phaseName = '百鬼狂潮';
      waveDensityFactor = 1.65 + (p - 0.6) * 0.55;
      waveHpFactor = 1.18 + (p - 0.6) * 0.85;
      waveSpeedFactor = 1.10;
    } else {
      phaseIndex = 5;
      phaseName = '决战魔主';
      waveDensityFactor = 0.88;
      waveHpFactor = 1.38;
      waveSpeedFactor = 1.08;
    }
  }

  // Ramp chapter scaling gracefully from early game (16% bonus at t=0) to full chapter intensity by Boss
  const chapRamp = 0.16 + Math.min(1, p) * 0.68;
  const effectiveChapterHp = 1 + (chapterDifficulty - 1) * chapRamp;
  const effectiveChapterDmg = 1 + (chapterDifficulty - 1) * (0.18 + Math.min(1, p) * 0.42);
  const effectiveChapterSpd = 1 + (chapterDifficulty - 1) * 0.08;

  // Progressive non-linear pacing modeled after Vampire Survivors:
  // Early game (p = 0..0.22): 8-15 active enemies.
  // Mid game (p = 0.22..0.6): 30-65 enemies, intense swarm waves.
  // Late game (p = 0.6..1.0): 75-135 enemies, full pressure horde survival.
  const baseCount = 8 + Math.pow(p, 1.32) * 78;
  const targetCount = Math.min(135, Math.max(6, Math.round(baseCount * waveDensityFactor * curve.densityMult)));
  const spawnChancePerSec = Math.min(22, (1.2 + Math.pow(p, 1.25) * 12.5) * waveDensityFactor * curve.densityMult);

  return {
    phaseIndex,
    phaseName,
    targetCount,
    spawnChancePerSec,
    hpMult: curve.hpMult * effectiveChapterHp * waveHpFactor,
    dmgMult: curve.dmgMult * effectiveChapterDmg,
    speedMult: curve.speedMult * effectiveChapterSpd * waveSpeedFactor * 1.04 * (curveId === 'standard' ? .85 + .15 * Math.min(1, elapsed / 75) : 1),
    expBonusFlat,
    progress: p
  };
}
