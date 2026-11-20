export const missiles = {
  spore: {color:0xed76ab, speed:140, windup:1.05, cooldown:4.2},
  arrow: {color:0xffc673, speed:215, windup:.85, cooldown:3.8},
  thorn: {color:0xf4db69, speed:182, windup:.9, cooldown:3.7},
  venom: {color:0xb4ee48, speed:160, windup:.9, cooldown:3.6},
  frost: {color:0x74dfff, speed:202, windup:.85, cooldown:3.8},
  ember: {color:0xff8855, speed:193, windup:.85, cooldown:3.65},
  spirit: {color:0xff77c0, speed:175, windup:.95, cooldown:3.45}
} as const;

export type MissileKind = keyof typeof missiles;
export interface EnemyShot {
  kind: MissileKind;
  x: number;
  y: number;
  dx: number;
  dy: number;
  remaining: number;
  damage: number;
}

export const FIRST_RANGED_WAVE = 35;
export function rangedWave(clock: number) {
  if (clock < 150) return {interval:30, count:1, cap:2};
  if (clock < 276) return {interval:22, count:2, cap:4};
  if (clock < 360) return {interval:32, count:1, cap:3};
  if (clock < 600) return {interval:16, count:2, cap:6};
  return {interval:30, count:1, cap:3};
}
