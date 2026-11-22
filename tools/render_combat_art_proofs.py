"""Render QA contact sheets from the packed battle textures. Pass a CJK font path on non-macOS."""
import sys
from pathlib import Path
from battle_atlas import ROOT,phaser_frames
from PIL import Image,ImageDraw,ImageFont
out=Path('screenshots/v1.1')
out.mkdir(parents=True,exist_ok=True)
font_path=sys.argv[1] if len(sys.argv)>1 else '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
font=lambda s:ImageFont.truetype(font_path,s)
paper=(46,48,39)
def label(d,x,y,s,size=21):d.text((x,y),s,font=font(size),fill='#eadfc5')
def load(key,ext='.webp'):
 return dict(phaser_frames(ROOT/key,ext))
def show(canvas,pose,x,footx,y,scale):
 im=pose.image.resize(tuple(max(1,round(v*scale)) for v in pose.image.size),Image.Resampling.LANCZOS)
 left=(pose.left-pose.size[0]/2)*scale; top=(pose.top-pose.size[1]/2-footx)*scale
 canvas.alpha_composite(im,(round(x+left),round(y+top)))
a=Image.new('RGBA',(1040,650),paper);d=ImageDraw.Draw(a)
rows=[('warrior','战士','5110501'),('wizard','法师','5120503'),('taoist','道士','5130503')]
for i,tag in enumerate(['初装','精制 / 上品','珍品 / 神品']):label(d,135+i*308,5,tag)
for i,(role,name,base) in enumerate(rows):
 y=215+207*i;label(d,8,y-105,name,22)
 hero=load('heroes/r_'+base+'@0','.png');dress=load('equipment/'+role+'-r');wep=load('equipment/'+role+'-w')
 for j in range(3):
  for v,poseID in enumerate(['30000','20000']):
   x=125+145*v+j*308
   body=hero['role/'+base+'/stand/'+poseID+'.png'] if not j else dress[f'r{j}/stand/'+poseID+'.png']
   sword=wep[f'w{j}/stand/'+poseID+'.png']
   show(a,body,x,31,y,1.13);show(a,sword,x,31,y,1.13)
a.convert('RGB').save(out/'equipment-poses.webp',quality=93)
bosses=[('20082','白骨尸王',43),('20111','铁甲刀卫',34),('20046','赤鬃兽王',35),('20038','碧鳞蛇王',53),('20072','霜角灵鹿',29),('20085','灭世魔君',45),('hydra_king','三头蛇王',20),('sky_pontiff','通天教主',21)]
a=Image.new('RGBA',(1024,8*134+45),paper);d=ImageDraw.Draw(a)
for i,h in enumerate(['行走','蓄势','出手','收招']):label(d,227+i*219,7,h)
for row,(key,cn,pivot) in enumerate(bosses):
 step=load('bosses/'+key);hit=load('bosses/'+key+'-cast')
 seq=[p for n,p in sorted(hit.items()) if n.startswith(key+'/attack/3')]
 poses=[step[key+'/walk/30000.png'],seq[0],seq[round((len(seq)-1)*.6)],seq[-1]]
 scale=min(1,165/max(p.image.width for p in poses),117/max(p.image.height for p in poses))
 y=46+row*134
 label(d,12,y+40,cn)
 for i,p in enumerate(poses):
  show(a,p,238+219*i,2*pivot,y+103,scale)
a.convert('RGB').save(out/'boss-poses.webp',quality=94)

from build_codex_art import boss_motion
a=Image.new("RGBA",(900,520),paper);d=ImageDraw.Draw(a)
headers=("震地","齐射","冲锋 / 召唤")
for i,h in enumerate(headers):label(d,215+260*i,8,h)
for row,(key,name) in enumerate([("20111","铁甲刀卫"),("sky_pontiff","通天教主")]):
 _,casts=boss_motion(key)
 height=44+228*row
 label(d,14,height+72,name)
 for i,kind in enumerate(casts):
  held=casts[kind][3]
  image=held.crop((230,280,570,560));image.thumbnail((259,206),Image.Resampling.LANCZOS)
  a.alpha_composite(image,(130+i*254,height+8))
a.convert("RGB").save(out/"boss-tells.webp",quality=94)
