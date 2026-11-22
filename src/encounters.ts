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

export const chapterLessons:Record<string,{move:string;tip:string}> = {
  sunset_island:{move:'震地',tip:'走出脚下的亮圈。'},
  central_state:{move:'短冲锋',tip:'向冲锋带两侧横移。'},
  hot_desert:{move:'沙环',tip:'贴近中心或退到沙环外。'},
  deadwater_marsh:{move:'连环毒沼',tip:'保持移动，绕开接连亮起的毒沼。'},
  frozen_citadel:{move:'冰爆',tip:'先离开冰心，再踏回内圈。'},
  iron_citadel:{move:'十字熔爆',tip:'斜向穿过熔爆之间的空隙。'},
  serpent_valley:{move:'蛇息',tip:'横移穿过两束毒息之间的空隙。'},
  heaven_tower:{move:'天火环',tip:'进入火环内的暗区。'}
};

// Wind-ups lock their position. Filled ground remains visible briefly after impact.
export function attackZones(chapter: string, enemy: MonsterEntity, player: PlayerState, clock: number): DangerZone[] {
  const zones: DangerZone[] = [];
  function mark(x: number, y: number, radius: number, delay: number, color: number, inner = 0) {
    zones.push({x, y, radius, inner, impact: clock + delay, color, owner: enemy.id, damage: Math.round(enemy.damage * 0.75)});
  }
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  if (!enemy.isBoss) {
    switch (chapter) {
      case 'hot_desert': mark(enemy.x,enemy.y,122,1.25,0xffa34a,54);break;
      case 'heaven_tower': mark(enemy.x,enemy.y,134,1.35,0xf39b4b,64);break;
      case 'deadwater_marsh':
        mark(player.x,player.y,48,1.1,0xb46fcd);
        mark(player.x+Math.cos(angle)*68,player.y+Math.sin(angle)*68,45,1.6,0xb46fcd);break;
      case 'frozen_citadel':
        mark(player.x,player.y,48,1.1,0x78c4ef);
        mark(player.x,player.y,112,1.85,0x78c4ef,59);break;
      case 'iron_citadel':
        for(let i=0;i<4;i++) mark(enemy.x+90*Math.cos(angle+i*Math.PI/2),enemy.y+90*Math.sin(angle+i*Math.PI/2),42,1.3,0xff823f);
        break;
      case 'serpent_valley':
        for(const offset of [-.46,.46]) for(const d of [78,143]) mark(enemy.x+Math.cos(angle+offset)*d,enemy.y+Math.sin(angle+offset)*d,34,1+d/500,0xab73be);
        break;
      default: mark(enemy.x,enemy.y,94,1.05,0xea713e);
    }
    return zones;
  }
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
