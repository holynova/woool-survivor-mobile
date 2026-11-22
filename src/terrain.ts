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

type Fixture = readonly [PropKind, number, number, number];
interface Landmark { name:string; pieces:readonly Fixture[]; passage:Point; }

// Each formation leaves a walkable break through its cover. The surrounding
// scatter uses its own seed, so changing a landmark cannot rearrange a chapter.
const landmarks:Record<string,Landmark>={
  sunset_island:{name:'桃林井台',passage:{x:1630,y:680},pieces:[
    ['tree_peach',1530,595,1.06],['tree_peach',1735,597,.98],['ancient_well',1700,715,1],['wood_fence',1530,772,1]]},
  central_state:{name:'中州前院',passage:{x:930,y:699},pieces:[
    ['ancient_well',786,696,1],['gate_engine',1050,757,1],['stone_lantern',845,754,1]]},
  hot_desert:{name:'沙海残关',passage:{x:906,y:844},pieces:[
    ['stele',794,785,1.15],['gate_engine',1003,805,1],['rock_boulder',1010,933,1.1],['dead_tree',782,950,.89]]},
  deadwater_marsh:{name:'枯柳渡口',passage:{x:1620,y:579},pieces:[
    ['tree_willow',1496,534,1.02],['stump',1550,662,.97],['dead_tree',1710,631,.91],['reeds',1650,478,1.06]]},
  frozen_citadel:{name:'冰牙隘口',passage:{x:1636,y:859},pieces:[
    ['ice_spires',1540,783,1.13],['snow_fir',1730,765,1.03],['ice_spires',1708,929,.96],['ice_spires',1534,964,.83]]},
  serpent_valley:{name:'蛇谷岔口',passage:{x:1640,y:685},pieces:[
    ['rock_boulder',1580,600,1.12],['stele',1730,710,1.1],['rock_boulder',1550,782,.87],['stump',1730,852,.91]]},
  heaven_tower:{name:'通天祭坛',passage:{x:1700,y:685},pieces:[
    ['brazier',1582,617,1],['stele',1780,602,1.1],['brazier',1796,750,1],['stele',1600,789,.92]]},
  iron_citadel:{name:'熔炉火门',passage:{x:1670,y:570},pieces:[
    ['lava_spire',1576,527,1.12],['gate_engine',1760,527,1],['brazier',1550,650,1],['brazier',1784,644,1]]},
};

interface DoorPath extends Point { dx:number; dy:number; lengthSq:number; }
function connectDoor(prop:TerrainProp, region:Region):DoorPath {
  const x=prop.x+(prop.flip?1:-1)*prop.width*.12, y=prop.y+FOOT_OFFSET+prop.ry*.75;
  for(let d=12;d<=360;d+=12) for(let i=0;i<24;i++){
    const dx=Math.cos(i*Math.PI/12)*d, dy=Math.sin(i*Math.PI/12)*d;
    if(region.route(x+dx,y+dy)<-18)return {x,y,dx,dy,lengthSq:d*d};
  }
  return {x,y,dx:0,dy:0,lengthSq:1};
}

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
  readonly landmark: Landmark;
  readonly doorPaths: DoorPath[];
  private cells: TerrainProp[][] = Array.from({length:COLS*Math.ceil(WORLD_HEIGHT/CELL)},()=>[]);

  constructor(chapter:string) {
    const region = this.region = regions[chapter] ?? regions.sunset_island;
    this.landmark=landmarks[chapter]??landmarks.sunset_island;
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
    };
    // Recognisable landmarks flank the clearing where a campaign begins.
    if(chapter==='central_state') {
      place('ancient_pavilion',850,495,1);
      place('stone_lantern',1015,613,1);
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
      if (kind==='ancient_pavilion' && (px<290 || px>WORLD_WIDTH-290 || py<265 || region.route(px,py)<145 || Math.hypot(px-1280,py-720)<505 || this.props.some(p=>p.kind===kind && Math.hypot(p.x-px,p.y-py)<720))) {
        kind='tree_pine';
      }
      place(kind,px,py,.73+random()*.4);
    }
    // Keep the three opening fixtures intact. Make room for the authored
    // formation and its passage without shifting random props elsewhere.
    const site=this.landmark;
    for(let i=this.props.length-1;i>=3;i--) {
      const p=this.props[i];
      const competes=site.pieces.some(([kind,x,y,scale])=>
        Math.hypot((p.x-x)/(p.rx+shapes[kind][1]*scale+52),(p.y-y)/(p.ry+shapes[kind][2]*scale+52))<1);
      if(competes || Math.hypot((p.x-site.passage.x)/(p.rx+55),(p.y-site.passage.y)/(p.ry+55))<1)
        this.props.splice(i,1);
    }
    for(const [kind,x,y,scale] of site.pieces)place(kind,x,y,scale);
    this.doorPaths=this.props.filter(p=>p.kind==='ancient_pavilion').map(p=>connectDoor(p,region));
    for(const prop of this.props) {
      const {x,y}=prop;
      // Index the entire footprint plus the maximum actor radius for a single lookup per substep.
      const reach=Math.max(prop.rx,prop.ry)+26;
      for(let j=Math.max(0,Math.floor((y-reach)/CELL));j<=Math.min(Math.ceil(WORLD_HEIGHT/CELL)-1,Math.floor((y+reach)/CELL));j++)
        for(let i=Math.max(0,Math.floor((x-reach)/CELL));i<=Math.min(COLS-1,Math.floor((x+reach)/CELL));i++)
          this.cells[j*COLS+i].push(prop);
    }
  }

  // Streets use their full width. Courtyard entrances use the same narrow
  // path painted from the front steps to the nearest piece of paving.
  streetEdge(x:number,y:number) {
    let edge=this.region.route(x,y);
    for(const p of this.doorPaths) {
      const rx=x-p.x, ry=y-p.y;
      const t=clamp((rx*p.dx+ry*p.dy)/p.lengthSq,0,1);
      edge=Math.min(edge,Math.hypot(rx-t*p.dx,ry-t*p.dy)-24);
    }
    return edge;
  }

  cityRangedPost(origin:Point,distance:number,startAngle:number,radius:number,allies:Point[]) {
    let best:Point|undefined, bestScore=Infinity;
    for(let i=0;i<48;i++) {
      const angle=startAngle+i*Math.PI/24;
      const x=origin.x+Math.cos(angle)*distance, y=origin.y+Math.sin(angle)*distance;
      if(x<80 || y<80 || x>WORLD_WIDTH-80 || y>WORLD_HEIGHT-80 || this.settle({x,y},radius))continue;
      // Prefer a street shoulder or doorstep. Vary nearby valid posts so that
      // allies do not occupy the same firing line, even on a multi-archer wave.
      const edge=this.streetEdge(x,y);
      const openStreet=Math.max(0,Math.abs(edge+8)-16);
      const crowd=allies.reduce((penalty,p)=>Math.max(penalty,66-Math.hypot(x-p.x,y-p.y)),0);
      const score=openStreet+crowd*2+i*.2;
      if(score<bestScore) {best={x,y};bestScore=score;}
    }
    return best;
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
