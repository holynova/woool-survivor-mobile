export const WORLD_WIDTH = 2560;
export const WORLD_HEIGHT = 1440;
export const PLAYER_RADIUS = 13;
export const FOOT_OFFSET = 24;

type Point = {x: number; y: number};

// A standing adult occupies roughly 105–118 world units. Width is the full
// isometric sprite, rx/ry are its solid base, and anchor is the ground contact.
const shapes = {
  tree_peach: [266, 19, 13, .96], tree_pine: [288, 23, 16, .96], tree_willow: [260, 22, 15, .95],
  ancient_pavilion: [510, 176, 80, .81], ancient_well: [112, 39, 22, .86], wood_fence: [134, 62, 8, .67],
  rock_boulder: [93, 35, 21, .83], stone_lantern: [35, 12, 8, .94],
  dead_tree: [212, 20, 14, .95], stele: [102, 37, 19, .89], stump: [85, 30, 16, .87],
  reeds: [57, 9, 6, .91], snow_fir: [270, 21, 15, .95], ice_spires: [130, 41, 21, .84],
  gate_engine: [128, 41, 24, .9], lava_spire: [146, 45, 22, .87], brazier: [52, 20, 12, .86]
} as const;
export type PropKind = keyof typeof shapes;
export interface TerrainProp extends Point {
  kind: PropKind; width: number; anchor: number; rx: number; ry: number; cos: number; sin: number; flip: boolean;
}
type Material = 'meadow' | 'paving' | 'sand' | 'mire' | 'snow' | 'basalt' | 'village_path' | 'city_sand';
interface Region {
  seed: number; base: Material; accent: Material; props: PropKind[];
  route: (x: number, y: number) => number; // Distance from an edge; negative is inside the second material.
}

const regions: Record<string, Region> = {
  sunset_island: {
    seed: 191, base:'meadow', accent:'village_path', props:['tree_peach','tree_peach','tree_willow','rock_boulder','wood_fence','ancient_well'],
    route:(x,y)=>Math.min(Math.abs(y-760-150*Math.sin(x/310))-52, Math.abs(x-730-(y-600)*.6)-33)
  },
  central_state: {
    seed: 723, base:'meadow', accent:'paving', props:['ancient_pavilion','stone_lantern','wood_fence','tree_pine','ancient_well','gate_engine'],
    route:(x,y)=>Math.min(Math.abs(y-715+.34*(x-1280))-92,Math.abs(x-1250-.63*(y-720))-63)
  },
  hot_desert: {
    seed: 1061, base:'sand', accent:'city_sand', props:['stele','rock_boulder','dead_tree','gate_engine','dead_tree'],
    route:(x,y)=>Math.abs(y-710-220*Math.sin(x/450)-60*Math.sin(x/157))-31
  },
  deadwater_marsh: {
    seed: 2109, base:'mire', accent:'meadow', props:['stump','reeds','tree_willow','reeds','dead_tree'],
    route:(x,y)=>Math.min(Math.abs(x-1150-270*Math.sin(y/220))-70, Math.abs(y-470-240*Math.cos(x/380))-55)
  },
  frozen_citadel: {
    seed: 3769, base:'snow', accent:'paving', props:['snow_fir','ice_spires','snow_fir','ice_spires'],
    route:(x,y)=>Math.abs(y-690-.28*(x-1280)-100*Math.sin(x/235))-44
  },
  serpent_valley: {
    seed: 4261, base:'mire', accent:'basalt', props:['rock_boulder','stele','reeds','dead_tree','stump'],
    route:(x,y)=>Math.abs(y-720-210*Math.sin(x/260))-82
  },
  heaven_tower: {
    seed: 6217, base:'paving', accent:'basalt', props:['brazier','stele','stone_lantern','gate_engine','stele'],
    route:(x,y)=>Math.min(Math.abs(Math.hypot((x-1280)*.73,y-720)-360)-60,Math.abs(x-1280)-65)
  },
  iron_citadel: {
    seed: 7103, base:'basalt', accent:'paving', props:['lava_spire','brazier','stele','lava_spire'],
    route:(x,y)=>Math.min(Math.abs(y-810+.48*(x-1180))-64,Math.abs(x-1530-.3*(y-450))-46)
  }
};

export function propUrl(kind: PropKind) {
  const file=kind==='ancient_pavilion' ? 'ancient_pavilion_hd' : kind==='stone_lantern' ? 'stone_lantern_paving' : kind;
  return './assets/woool/terrain/'+file+'.webp';
}

const CELL = 160;
const COLS = Math.ceil(WORLD_WIDTH/CELL);
const clamp = (value:number, min:number, max:number) => Math.min(max,Math.max(min,value));

export class Terrain {
  readonly region: Region;
  readonly props: TerrainProp[] = [];
  private cells: TerrainProp[][] = Array.from({length:COLS*Math.ceil(WORLD_HEIGHT/CELL)},()=>[]);

  constructor(chapter:string) {
    const region = this.region = regions[chapter] ?? regions.sunset_island;
    let seed = region.seed;
    function random() { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
    const place=(kind:PropKind,x:number,y:number,scale:number)=>{
      const [width,rx,ry,anchor]=shapes[kind];
      // Built objects vary little in size. Vegetation can vary with age.
      if (['ancient_pavilion','stone_lantern','brazier','gate_engine','ancient_well','wood_fence'].includes(kind)) {
        scale=clamp(scale,.96,1.04);
      }
      const flip=random()<.5;
      if (this.props.some(p => Math.hypot((p.x-x)/(p.rx+rx*scale+24),(p.y-y)/(p.ry+ry*scale+24)) < 1)) return;
      const angle=kind==='wood_fence' ? (flip ? .56 : -.56) : 0;
      const prop={kind,x,y,width:width*scale,rx:rx*scale,ry:ry*scale,anchor,flip,cos:Math.cos(angle),sin:Math.sin(angle)};
      this.props.push(prop);
      // Index the entire footprint plus the maximum actor radius for a single lookup per substep.
      const reach=Math.max(prop.rx,prop.ry)+26;
      for(let j=Math.max(0,Math.floor((y-reach)/CELL));j<=Math.min(Math.ceil(WORLD_HEIGHT/CELL)-1,Math.floor((y+reach)/CELL));j++)
        for(let i=Math.max(0,Math.floor((x-reach)/CELL));i<=Math.min(COLS-1,Math.floor((x+reach)/CELL));i++)
          this.cells[j*COLS+i].push(prop);
    };
    // Recognisable landmarks flank the clearing where a campaign begins.
    if(chapter==='central_state') {
      place('ancient_pavilion',960,548,1);
      place('stone_lantern',1125,666,1);
    } else {
      place(region.props[0],1115,622,1.05);
      place(region.props[1],1460,832,.88);
    }
    place(region.props[2],1372,495,.92);
    for(let y=100;y<WORLD_HEIGHT-50;y+=205) for(let x=95;x<WORLD_WIDTH-50;x+=225) {
      const px=x+(random()-.5)*120, py=y+(random()-.5)*105;
      if(px<155 || py<140 || px>WORLD_WIDTH-155 || py>WORLD_HEIGHT-140 || Math.hypot(px-1280,py-720)<123 || region.route(px,py)<-5 ||
         this.props.some(p=>Math.hypot(p.x-px,p.y-py)<153)) continue;
      let kind=region.props[Math.floor(random()*region.props.length)];
      if (kind==='ancient_pavilion' && (px<290 || px>WORLD_WIDTH-290 || py<265 || region.route(px,py)<120 || this.props.some(p=>p.kind===kind && Math.hypot(p.x-px,p.y-py)<720))) {
        kind='tree_pine';
      }
      place(kind,px,py,.73+random()*.4);
    }
  }

  // Resolve an ellipse in its local coordinates. The hitbox sits at the prop's feet, independent of its canopy.
  settle(p:Point, radius:number) {
    const nearby=this.cells[Math.floor(p.y/CELL)*COLS+Math.floor(p.x/CELL)];
    if(!nearby) return false;
    let blocked=false;
    for(const ob of nearby) {
      const dx=p.x-ob.x, dy=p.y-ob.y;
      const rx=ob.rx+radius, ry=ob.ry+radius;
      const u=dx*ob.cos+dy*ob.sin, v=-dx*ob.sin+dy*ob.cos;
      const norm=u*u/(rx*rx)+v*v/(ry*ry);
      if(norm>=1) continue;
      const k=norm>1e-10 ? 1.00001/Math.sqrt(norm) : 0;
      const a=u*k, b=k ? v*k : ry+.01;
      p.x=ob.x+a*ob.cos-b*ob.sin;
      p.y=ob.y+a*ob.sin+b*ob.cos;
      blocked=true;
    }
    return blocked;
  }

  move(p:Point, dx:number, dy:number, radius=PLAYER_RADIUS, steer=0) {
    // Substeps also cover dashes and instantaneous knockback, which otherwise tunnel through trees.
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/12));
    const sx=dx/steps, sy=dy/steps;
    for(let i=0;i<steps;i++) {
      const x=p.x, y=p.y;
      p.x=clamp(x+sx,70,WORLD_WIDTH-70); p.y=clamp(y+sy,70,WORLD_HEIGHT-70);
      if(this.settle(p,radius) && steer && (p.x-x)*sx+(p.y-y)*sy < .22*(sx*sx+sy*sy)) {
        // A pursuer arriving head-on can slide around either end instead of walking into the trunk forever.
        p.x-=sy*steer*.8; p.y+=sx*steer*.8; this.settle(p,radius);
      }
    }
  }
}

const terrainCache=new Map<string,Terrain>();
export function chapterTerrain(id:string) {
  let terrain=terrainCache.get(id);
  if(!terrain) { terrain=new Terrain(id); terrainCache.set(id,terrain); }
  return terrain;
}

export const monsterFootprint = (m:{radius:number}) => clamp(m.radius*.4,9,24);
