import type {BossCast} from './boss';

type Kind=BossCast['kind'];
type KeyPose=readonly [frame:number,width:number,height:number,lean:number];
type Motion={anticipation:KeyPose; release:KeyPose; windup:number; hold:number};

// Frames are fractions of each creature's own attack strip. The last part of
// wind-up is a held pose: the player sees the tell even at a low frame rate.
const motions:Record<Kind,Motion>={
  charge:{anticipation:[.52,1.13,.79,10],release:[.77,1.08,.92,13],windup:.80,hold:.22},
  volley:{anticipation:[.29,.97,1.01,-7],release:[.77,1.03,1.01,5],windup:.65,hold:.31},
  summon:{anticipation:[.34,.93,1.14,-3],release:[.52,1.01,1.07,0],windup:.96,hold:.20},
  ground:{anticipation:[.08,.98,1.08,-5],release:[.70,1.12,.86,6],windup:.84,hold:.12}
};
const neutral:KeyPose=[0,1,1,0], finished:KeyPose=[1,1,1,0];
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};

export function bossPose(kind:Kind,clock:number,impact:number,recoverAt:number,frames:number,facing:number,footHeight:number,spriteKey="") {
  const motion=motions[kind], before=clock<impact;
  // The pontiff lifts his blade on frame 2 and levels it on frame 4.
  const aim:KeyPose=kind==='volley' && spriteKey==='sky_pontiff'
    ? [.55,.97,1.01,-7] : motion.anticipation;
  const from=before ? neutral : motion.release;
  const to=before ? aim : finished;
  const t=before ? smooth((clock-impact+motion.windup)/(motion.windup-motion.hold))
    : smooth((clock-recoverAt)/.26);
  const mix=(index:number)=>from[index]+(to[index]-from[index])*t;
  const angle=mix(3)*Math.sin(facing*Math.PI/4)*Math.PI/180, height=mix(2);
  // Rotate about the planted foot while keeping Phaser's trimmed-frame origin.
  return {frame:Math.round(mix(0)*(frames-1)),width:mix(1),height,angle,
    xOffset:Math.sin(angle)*footHeight*height,yOffset:-Math.cos(angle)*footHeight*height};
}
