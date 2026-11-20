import Phaser from 'phaser';
import { FOOT_OFFSET, WORLD_HEIGHT, WORLD_WIDTH, Terrain, propUrl } from './terrain';

export function preloadField(scene: Phaser.Scene, terrain: Terrain) {
  for (const material of [terrain.region.base, terrain.region.accent]) {
    scene.load.image('land-'+material, './assets/woool/terrain/'+material+'.webp');
  }
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
    const distance = terrain.region.route(x,y) + roughness;
    pixels.data[(j*mask.width+i)*4+3] = 255*Phaser.Math.Clamp(.5-distance/36,0,1);
  }
  ctx.putImageData(pixels,0,0);
  return mask;
}

function drawGround(scene: Phaser.Scene, terrain: Terrain) {
  const mask = roadMask(terrain);
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
    chunk.refresh();
    scene.add.image(x,y,key).setOrigin(0).setDepth(-2000);
  }
}

export function buildField(scene: Phaser.Scene, terrain: Terrain) {
  drawGround(scene,terrain);
  const shadows=scene.add.graphics().setDepth(-50);
  const props=terrain.props.map(prop=>{
    const feet=prop.y+FOOT_OFFSET;
    shadows.fillStyle(0x18170c,.18).fillEllipse(prop.x+2,feet,prop.rx*2.5,prop.ry*1.7);
    const sprite=scene.add.image(prop.x,feet,'prop-'+prop.kind)
      .setOrigin(.5,prop.anchor).setFlipX(prop.flip).setDepth(prop.y);
    sprite.setScale(prop.width/sprite.width);
    return {prop,sprite};
  });
  return (player:{x:number;y:number})=>{
    for (const {prop,sprite} of props) {
      const behind=prop.y-player.y;
      const covered=behind>0 && behind<sprite.displayHeight*prop.anchor+12 &&
        Math.abs(player.x-prop.x)<prop.width*.39;
      sprite.setAlpha(covered ? .52 : 1);
    }
  };
}
