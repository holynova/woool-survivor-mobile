import type { MonsterEntity, PlayerState } from './types';

export interface DangerZone {
  x: number;
  y: number;
  radius: number;
  inner: number;
  impact: number;
  damage: number;
  color: number;
  owner: number;
}

// Wind-ups lock their position. Filled ground remains visible briefly after impact.
export function attackZones(chapter: string, enemy: MonsterEntity, player: PlayerState, clock: number): DangerZone[] {
  const zones: DangerZone[] = [];
  function mark(x: number, y: number, radius: number, delay: number, color: number, inner = 0) {
    zones.push({x, y, radius, inner, impact: clock + delay, color, owner: enemy.id, damage: Math.round(enemy.damage * 0.75)});
  }
  if (!enemy.isBoss) {
    mark(enemy.x, enemy.y, 106, 0.9, 0xea713e);
    return zones;
  }
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  switch (chapter) {
    case 'serpent_valley':
      for (const offset of [-.58, 0, .58]) for (const distance of [85,170,255]) {
        mark(enemy.x+distance*Math.cos(angle+offset),enemy.y+distance*Math.sin(angle+offset),53,.8+distance/460,0xab73be);
      }
      break;
    case 'heaven_tower':
      mark(enemy.x,enemy.y,118,.95,0xf39b4b);
      mark(enemy.x,enemy.y,253,1.85,0xe66744,124);
      break;
    case 'central_state':
      for (let i = 1; i <= 5; i++) mark(enemy.x + Math.cos(angle)*64*i, enemy.y + Math.sin(angle)*64*i, 49, .85+i*.09, 0xf2764c);
      break;
    case 'hot_desert':
      mark(enemy.x, enemy.y, 210, 1.35, 0xffa34a, 86);
      break;
    case 'deadwater_marsh':
      for (let i=0; i<3; i++) mark(player.x+Math.cos(angle+i*2.094)*60, player.y+Math.sin(angle+i*2.094)*60, 70, 1.35+i*.22, 0xb46fcd);
      break;
    case 'frozen_citadel':
      mark(player.x,player.y,70,.95,0x78c4ef);
      mark(player.x,player.y,165,1.8,0x78c4ef,80);
      break;
    case 'iron_citadel':
      mark(player.x,player.y,98,1.05,0xff5134);
      for(let i=0;i<4;i++) mark(player.x+135*Math.cos(angle+i*Math.PI/2),player.y+135*Math.sin(angle+i*Math.PI/2),65,1.7,0xff823f);
      break;
    default:
      mark(enemy.x, enemy.y, 145, 1.1, 0xe2644b);
  }
  return zones;
}
