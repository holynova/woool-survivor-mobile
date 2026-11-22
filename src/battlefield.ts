import Phaser from 'phaser';
import type { MonsterEntity } from './types';
import { CHARGE_RADIUS } from './boss';
import type { DangerZone } from './encounters';
import { FOOT_OFFSET, WORLD_HEIGHT, WORLD_WIDTH, Terrain, propUrl, type TerrainProp } from './terrain';

export function preloadField(scene: Phaser.Scene, terrain: Terrain) {
  for (const material of [terrain.region.base, terrain.region.accent]) {
    scene.load.image('land-'+material, './assets/woool/terrain/'+(material==='basalt'?'basalt_worn':material)+'.webp');
  }
  if(terrain.props.some(p=>p.kind==='snow_fir'))scene.load.image('prop-snow_snag','./assets/woool/terrain/snow_snag.webp');
  for (const kind of new Set(terrain.props.map(p=>p.kind))) {
    scene.load.image('prop-'+kind, propUrl(kind));
  }
}

function roadMask(terrain: Terrain) {
  const mask = document.createElement('canvas');
  const step = 4;
  mask.width = WORLD_WIDTH / step;
  mask.height = WORLD_HEIGHT / step;
  const ctx = mask.getContext('2d')!;
  const pixels = ctx.createImageData(mask.width, mask.height);
  for (let j=0; j<mask.height; j++) for (let i=0; i<mask.width; i++) {
    const x = (i+.5)*step, y = (j+.5)*step;
    const roughness = 7*Math.sin(x/19+y/23) + 4*Math.cos(x/13-y/9) + 13*Math.sin(y/73-x/65);
    let distance = terrain.region.route(x,y) + roughness;
    for(const path of terrain.doorPaths) {
      const rx=x-path.x, ry=y-path.y;
      const t=Phaser.Math.Clamp((rx*path.dx+ry*path.dy)/path.lengthSq,0,1);
      const toDoor=Math.hypot(rx-t*path.dx,ry-t*path.dy)-24+roughness*.38;
      distance=Math.min(distance,toDoor);
    }
    pixels.data[(j*mask.width+i)*4+3] = 255*Phaser.Math.Clamp(.5-distance/36,0,1);
  }
  ctx.putImageData(pixels,0,0);
  return mask;
}

const soil: Record<string,string> = {
  meadow:'88,72,40', sand:'141,107,65', mire:'46,57,40', snow:'147,164,174',
  paving:'83,74,61', basalt:'74,57,51'
};

function wash(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,rgb:string,opacity:number) {
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(rx,ry);
  const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
  gradient.addColorStop(0,`rgba(${rgb},${opacity})`);
  gradient.addColorStop(.52,`rgba(${rgb},${opacity*.64})`);
  gradient.addColorStop(1,`rgba(${rgb},0)`);
  ctx.fillStyle=gradient;
  ctx.fillRect(-1,-1,2,2);
  ctx.restore();
}

// Paint wear into the same material as the surrounding chunk. The scratch
// canvas is reused; there are no extra shadow sprites or per-frame particles.
function groundProp(ctx:CanvasRenderingContext2D, scratch:HTMLCanvasElement, paving:CanvasPattern,
                    terrain:Terrain, prop:TerrainProp) {
  const {x,rx,ry,kind}=prop, y=prop.y+FOOT_OFFSET;
  const house=kind==='ancient_pavilion';
  const masonry=house || kind==='ancient_well' || kind==='stone_lantern' || kind==='gate_engine' || kind==='brazier';
  const radius=rx*(masonry ? 1.42 : 1.75)+8, depth=ry*1.55+6;
  const tone=soil[terrain.region.base];
  const litter=kind==='tree_peach' ? '189,140,109' : kind==='tree_willow' || kind==='tree_pine' ? '137,132,80'
    : kind==='snow_fir' ? '216,225,229' : '203,186,153';
  wash(ctx,x-3,y+2,radius,depth,tone,.39);
  if(masonry) {
    // Expose worn paving around the doorstep, with a feathered irregular edge.
    const apronY=y+ry*.46;
    scratch.width=Math.ceil(radius*2)+4; scratch.height=Math.ceil(depth*2)+4;
    const sc=scratch.getContext('2d')!, cx=scratch.width/2, cy=scratch.height/2;
    wash(sc,cx,cy,radius,depth,'255,255,255',.63);
    wash(sc,cx+(prop.flip?-1:1)*radius*.27,cy+depth*.24,radius*.65,depth*.67,'255,255,255',.77);
    sc.globalCompositeOperation='source-in';
    sc.translate(cx-x,cy-apronY);
    sc.scale(.74,.74);
    sc.fillStyle=paving;
    sc.fillRect((x-cx)/.74,(apronY-cy)/.74,scratch.width/.74,scratch.height/.74);
    ctx.drawImage(scratch,x-cx,apronY-cy);
  }
  // Broad cast shadow and dark contact at the base follow the same light direction.
  wash(ctx,x-rx*.46,y+ry*.27,rx*1.55+7,ry*1.22+2,'27,24,19',.34);
  wash(ctx,x,y+1,rx*1.18+3,ry*.88+2,'29,24,18',.54);
  let seed=Math.round(x*11+y*29);
  const next=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const count=house ? 48 : 12;
  for(let i=0;i<count;i++){
    const angle=next()*Math.PI*2, dist=.62+next()*.52;
    const px=x+Math.cos(angle)*radius*dist,py=y+Math.sin(angle)*depth*dist;
    const width=1+next()*(masonry?3.5:2.4);
    ctx.fillStyle=i%3===0?`rgba(${litter},.42)`:'rgba(41,36,26,.30)';
    ctx.beginPath();ctx.ellipse(px,py,width,width*.50,angle*.2,0,Math.PI*2);ctx.fill();
  }
}

function drawGround(scene: Phaser.Scene, terrain: Terrain) {
  const mask = roadMask(terrain);
  const scratch=document.createElement('canvas');
  const overlay = document.createElement('canvas');
  const overlayCtx = overlay.getContext('2d')!;
  const pattern = (material:string) => overlayCtx.createPattern(
    scene.textures.get('land-'+material).getSourceImage() as HTMLImageElement, 'repeat')!;
  const base = pattern(terrain.region.base), accent = pattern(terrain.region.accent);
  const size = 512, textureScale = .74;
  function fill(ctx:CanvasRenderingContext2D, texture:CanvasPattern, x:number, y:number, w:number, h:number) {
    ctx.save();
    ctx.translate(-x,-y);
    ctx.scale(textureScale,textureScale);
    ctx.fillStyle=texture;
    ctx.fillRect(x/textureScale,y/textureScale,w/textureScale,h/textureScale);
    ctx.restore();
  }
  // One extra texel overlaps the next chunk so filtering cannot expose the camera background.
  for (let y=0;y<WORLD_HEIGHT;y+=size) for (let x=0;x<WORLD_WIDTH;x+=size) {
    const w=Math.min(size+1,WORLD_WIDTH-x), h=Math.min(size+1,WORLD_HEIGHT-y);
    overlay.width=w; overlay.height=h;
    const key='ground-'+x+'-'+y;
    const chunk=scene.textures.createCanvas(key,w,h)!;
    fill(chunk.context,base,x,y,w,h);
    fill(overlayCtx,accent,x,y,w,h);
    overlayCtx.globalCompositeOperation='destination-in';
    overlayCtx.drawImage(mask,-x,-y,WORLD_WIDTH,WORLD_HEIGHT);
    chunk.context.drawImage(overlay,0,0);
    chunk.context.save();
    chunk.context.translate(-x,-y);
    for (const prop of terrain.props) {
      const marginX=prop.rx*2.2+24,marginY=prop.ry*2.5+24;
      const feet=prop.y+FOOT_OFFSET;
      if(prop.x+marginX>=x && prop.x-marginX<=x+w && feet+marginY>=y && feet-marginY<=y+h) {
        groundProp(chunk.context,scratch,accent,terrain,prop);
      }
    }
    chunk.context.restore();
    chunk.refresh();
    scene.add.image(x,y,key).setOrigin(0).setDepth(-2000);
  }
}

export function buildField(scene: Phaser.Scene, terrain: Terrain) {
  drawGround(scene,terrain);
  const props=terrain.props.map((prop,index)=>{
    const feet=prop.y+FOOT_OFFSET;
    const sparse=prop.kind==='snow_fir' && index%3===1;
    const sprite=scene.add.image(prop.x,feet,sparse?'prop-snow_snag':'prop-'+prop.kind)
      .setOrigin(.5,prop.anchor).setFlipX(prop.flip).setDepth(prop.y);
    sprite.setScale(prop.width*(sparse ? .76 : 1)/sprite.width);
    if(prop.kind==='ancient_pavilion')sprite.setTint(0xd8d4c9,0xd8d4c9,0xfbfaeb,0xfbfaeb);
    const coverBounds=new Phaser.Geom.Rectangle(
      prop.x-prop.width*.45-CHARGE_RADIUS,prop.y-sprite.displayHeight*prop.anchor-CHARGE_RADIUS,
      prop.width*.9+2*CHARGE_RADIUS,sprite.displayHeight*prop.anchor+2*CHARGE_RADIUS);
    return {prop,sprite,coverBounds};
  });
  return (player:{x:number;y:number},monsters:MonsterEntity[],zones:DangerZone[])=>{
    const dangerous=monsters.filter(m=>m.isBoss || m.aim || m.bossCast);
    const charges=dangerous.flatMap(m=>{
      const c=m.bossCast;
      return c?.kind==='charge'?[new Phaser.Geom.Line(c.from.x,c.from.y,c.to.x,c.to.y)]:[];
    });
    const blend=1-Math.exp(-Math.min(scene.game.loop.delta || 16,80)/85);
    for (const {prop,sprite,coverBounds} of props) {
      const behind=(actor:{x:number;y:number},margin:number)=>{
        const dy=prop.y-actor.y;
        return dy>=-2 && dy<sprite.displayHeight*prop.anchor+margin && Math.abs(actor.x-prop.x)<prop.width*.46+margin;
      };
      // Reveal the near part of a telegraph even if its centre (or caster) is clear of the eaves.
      const hidesZone=zones.some(z=>{
        const dx=Math.max(0,Math.abs(z.x-prop.x)-prop.width*.42);
        const dy=Math.max(0,z.y-prop.y,prop.y-sprite.displayHeight*prop.anchor-z.y);
        return dx*dx+dy*dy<z.radius*z.radius;
      });
      const hidesCharge=charges.some(line=>Phaser.Geom.Intersects.LineToRectangle(line,coverBounds));
      const target=hidesZone || hidesCharge || dangerous.some(m=>behind(m,20)) ? .27 : behind(player,7) ? .42 : 1;
      if (Math.abs(sprite.alpha-target)>.003) sprite.setAlpha(sprite.alpha+(target-sprite.alpha)*blend);
    }
  };
}
