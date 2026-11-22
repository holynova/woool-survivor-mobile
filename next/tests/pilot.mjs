// Sample short movement arcs. The pilot can see monsters, warnings and loot, and uses ordinary movement and upgrade inputs.
export function steer(g) {
  const p = g.player, near = g.monsters.filter(m => Math.abs(m.x-p.x)<420 && Math.abs(m.y-p.y)<420);
  let goal=g.getActiveBoss(), closest=Infinity;
  if (!goal) for (const d of g.drops) {
    const dist=Math.hypot(d.x-p.x,d.y-p.y);
    const cost=dist/(d.type==='gear' || (d.type==='potion' && p.hp<p.maxHp*.75) ? 2 : 1);
    if(cost < closest && dist>25){goal=d;closest=cost;}
  }
  if (!goal) goal=g.monsters.reduce((a,m)=>!a||Math.hypot(m.x-p.x,m.y-p.y)<Math.hypot(a.x-p.x,a.y-p.y)?m:a,null);
  let best=-Infinity, bestX=0,bestY=0;
  for(let i=0;i<16;i++){
    const dx=Math.cos(i*Math.PI/8),dy=Math.sin(i*Math.PI/8);
    const x=p.x+dx*150,y=p.y+dy*150;
    const edge=Math.min(x-80,2480-x,y-80,1360-y);
    let score=Math.min(edge,150)*.12+Math.min(edge,0)*3+(dx*g.inputX+dy*g.inputY)*7;
    // A screened path ends early at solid scenery. Avoid walking into the same trunk.
    const path={x:p.x,y:p.y};
    g.terrain.move(path,dx*90,dy*90);
    score-=Math.hypot(path.x-(p.x+dx*90),path.y-(p.y+dy*90))*3.5;
    for(const shot of g.enemyShots) {
      const rx=p.x-shot.x,ry=p.y-shot.y;
      const ahead=rx*shot.dx+ry*shot.dy;
      if(ahead>=0 && ahead<160 && Math.abs(rx*shot.dy-ry*shot.dx)<38){
        const cross=Math.abs((rx+dx*60)*shot.dy-(ry+dy*60)*shot.dx);
        score-=Math.max(0,52-cross)*2;
      }
    }
    if(goal)score-=Math.hypot(goal.x-x,goal.y-y)*.38;
    for(const m of near){
      const d=Math.hypot(m.x-x,m.y-y)-m.radius;
      const mid=Math.hypot(m.x-(p.x+dx*70),m.y-(p.y+dy*70))-m.radius;
      score-=Math.max(0,100-d)*1.6+Math.max(0,48-mid)*2.2;
    }
    for(const m of near){
      const cast=m.bossCast;
      if(cast?.kind!=='charge')continue;
      const lx=cast.to.x-cast.from.x,ly=cast.to.y-cast.from.y;
      const t=Math.max(0,Math.min(1,((x-cast.from.x)*lx+(y-cast.from.y)*ly)/(lx*lx+ly*ly||1)));
      if(Math.hypot(x-cast.from.x-lx*t,y-cast.from.y-ly*t)<43)score-=145;
    }
    for(const z of g.dangers){
      const d=Math.hypot(z.x-x,z.y-y);
      if(d<z.radius+16 && d>Math.max(0,z.inner-16))score-=155;
    }
    if(score>best){best=score;bestX=dx;bestY=dy}
  }
  g.setInput(bestX,bestY);
}
export function choose(g){
  const rating=c=>{
    const priority=['moon_blade','hell_thunder','shinsu_summon','dragon_purple_lightning','celestial_meteor','enhanced_skeleton','thunder_sword','ice_roar','fire_sword','ghost_fire_curse','poison_spell'];
    return (c.type==='skill'? 10:0) + (priority.includes(c.id)?8:0) + (!c.isNew?3:0);
  };
  const options=[...g.upgradeChoices].sort((a,b)=>rating(b)-rating(a));
  if(!options.length)throw Error('Empty upgrade menu');
  const preferred=options.find(c=>!c.swap);
  if(preferred)g.selectUpgrade(preferred);else g.keepLoadout();
}
