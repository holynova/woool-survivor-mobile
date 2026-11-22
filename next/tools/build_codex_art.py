"""Bake small bestiary portraits and spell demonstrations from the shipped atlases.
Run from the repository root with: uv run --with pillow tools/build_codex_art.py
"""
from functools import lru_cache
import json
from pathlib import Path
import sys
import subprocess
import math
import re

from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path("public/assets/woool")
OUT = ROOT / "codex"
SIZE = (432, 220)
HERO = {1: "5110501", 2: "5120503", 3: "5130503"}


@lru_cache(maxsize=10)
def atlas(base):
    frames, pages = {}, {}
    for path in sorted(ROOT.glob(base + "@*.json")):
        pages[path] = Image.open(path.with_suffix(".png")).convert("RGBA")
        for name, spec in json.loads(path.read_text())["frames"].items():
            frames[name] = (path, spec)
    return pages, frames


@lru_cache(maxsize=40)
def sequence(base, action, direction="0"):
    pages, atlas_frames = atlas(base)
    frames = []
    for name, (page, spec) in sorted(atlas_frames.items()):
        if not re.search(f"/{action}/{direction}[0-9]+.png$", name):
            continue
        box, offset = spec["frame"], spec["spriteSourceSize"]
        assert not spec["rotated"], name
        x, y, w, h = (box[k] for k in ("x", "y", "w", "h"))
        frames.append((pages[page].crop((x, y, x+w, y+h)), offset["x"], offset["y"]))
    if not frames and base.startswith("monsters/") and (action,direction)!=("walk","3"):
        return sequence(base,"walk","3")
    assert frames, (base, action, direction)
    return frames


def actor(scene, base, action, direction, index, x, feet, scale=.82, mirror=False):
    frames = sequence(base, action, direction)
    img, left, top = frames[index % len(frames)]
    ref, rx, ry = sequence(base, "stand", direction)[0]
    center, bottom = rx + ref.width / 2, ry + ref.height
    px = x + (left-center)*scale
    if mirror:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        px = x + (center-left-img.width)*scale
    img = img.resize((round(img.width*scale), round(img.height*scale)), Image.Resampling.LANCZOS)
    py = feet + (top-bottom)*scale
    ImageDraw.Draw(scene).ellipse((x-22*scale,feet-5*scale,x+22*scale,feet+4*scale),fill=(18,16,10,108))
    scene.alpha_composite(img,(round(px),round(py)))


def effect(scene, skill, action, elapsed, xy, fit, direction="0", loop=False):
    frames = sequence(f"skills_fx/s_{skill}", action, direction)
    if elapsed < 0 or elapsed >= len(frames) and not loop:
        return
    # A common bounding box preserves the movement and alignment of every frame.
    x0 = min(x for _,x,y in frames)
    x1 = max(x+im.width for im,x,y in frames)
    y0 = min(y for _,x,y in frames)
    y1 = max(y+im.height for im,x,y in frames)
    img, left, top = frames[elapsed % len(frames)]
    scale = min(fit[0]/(x1-x0), fit[1]/(y1-y0))
    pos = (round(xy[0]+(left-(x0+x1)/2)*scale), round(xy[1]+(top-(y0+y1)/2)*scale))
    img = img.resize((max(1,round(img.width*scale)),max(1,round(img.height*scale))),Image.Resampling.LANCZOS)
    scene.alpha_composite(img,pos)


def export(frames, name, poster, duration):
    frames[poster].save(OUT / (name+"-still.webp"),quality=88,method=4)
    frames[0].save(OUT / (name+".webp"),save_all=True,append_images=frames[1:],
                   duration=duration,loop=0,quality=83,method=4,allow_mixed=True)


def spell(skill):
    hero = "heroes/r_"+HERO[skill//1000]
    melee = skill in (1002,1003,1004,1006,1010,1102)
    support = skill in (1008,2009,3001,3303,2003)
    summons = {3007:"20085",3008:"20081",3012:"20082"}
    projectile = skill in (2001,3002,3011)
    frames = []
    visibility = []
    for i in range(31):
        scene = Image.new("RGBA", SIZE)
        x = 145 if melee else 216 if support else 119
        if skill == 1010:
            x += min(86,max(0,(i-4)*15))
        target = 254 if melee else 309
        if not support and skill not in summons:
            actor(scene,"monsters/m_20081","stand","2",i//5,target,183,.81,True)
        action = "attack" if melee else "casting"
        casting = sequence(hero,action,"2")
        if i<3 or i>=3+len(casting):
            actor(scene,hero,"stand","2",i//5,x,181)
        else:
            actor(scene,hero,action,"2",i-3,x,181)
        if skill in summons and i>=10:
            actor(scene,"monsters/m_"+summons[skill],"stand","3",i//3,287,184,.92)
        actors = scene.copy()
        if melee:
            effect(scene,skill,"attack",i-5,((x+target)/2,127),(174,119),"2")
        elif projectile:
            if skill!=2001:
                effect(scene,skill,"casting",i-1,(x,123),(104,111))
            if 5<=i<15:
                effect(scene,skill,"track",i-5,(x+24+(target-x-24)*(i-5)/10,124),(62,45),loop=True)
            effect(scene,skill,"hit",i-15,(target,126),(109,105))
        elif skill==2011:
            if 4<=i<11:
                effect(scene,2202,"track",i-4,(target-22+(i-4)*3,16+(i-4)*17),(75,79),loop=True)
            effect(scene,2202,"hit",i-11,(target,129),(160,146))
        elif skill==2007:
            for n in range(4):
                effect(scene,skill,"hit",i-4-n*2,(x+42+43*n,138),(79,102))
        elif skill==1008:
            effect(scene,skill,"casting",i-3,(x,126),(137,138))
            if 9<=i<26:
                effect(scene,skill,"loop",i-9,(x,126),(145,137),loop=True)
        else:
            action = "casting" if skill==3303 else "loop" if skill==2009 else "hit"
            height = 175 if skill in (2002,2010) else 136
            where = x if support else 287 if skill in summons else target
            effect(scene,skill,action,i-4,(where,180-height/2),(187,height),loop=skill==2009 and 4<=i<25)
        background = Image.new("RGBA",SIZE,(61,63,48,255))
        diff = ImageChops.difference(Image.alpha_composite(background,actors).convert("RGB"),
                                     Image.alpha_composite(background,scene).convert("RGB"))
        visibility.append(sum(ImageStat.Stat(diff).sum) if skill not in summons or i>=10 else 0)
        frames.append(scene)
    poster = max(range(len(frames)),key=visibility.__getitem__)
    export(frames,f"s-{skill}",poster,82)


def monster(key):
    frames=[]
    archived = not any('/attack/' in name for name in atlas('monsters/m_'+key)[1])
    count = len(sequence('monsters/m_'+key,'walk','3')) if archived else 12
    for i in range(count):
        scene=Image.new("RGBA",SIZE)
        actor(scene,"monsters/m_"+key,"walk" if archived or i<6 else "attack","3",i if archived or i<6 else i-6,216,190,1.12)
        frames.append(scene)
    export(frames,"m-"+key,1,145)
    portrait=frames[1].crop(frames[1].getbbox())
    portrait.thumbnail((90,90), Image.Resampling.LANCZOS)
    portrait.save(OUT / ("portrait-"+key+".webp"),quality=88)


BOSS_FOOT = {'20111':34,'20038':53,'20046':35,'20082':43,'20072':29,'20085':45,'sky_pontiff':21,'hydra_king':20}


def boss_motion(key):
    """Sample the same timed body poses and foot pivot used by the live renderer."""
    actions={}
    for suffix,action in (("", "walk"), ("-cast","attack")):
        stem=ROOT/"bosses"/(key+suffix)
        atlas_image=Image.open(stem.with_suffix(".webp")).convert("RGBA")
        meta=json.loads(stem.with_suffix(".json").read_text())["frames"]
        poses=[]
        for name,s in sorted(meta.items()):
            if "/"+action+"/3" not in name: continue
            r=s["frame"]; p=s["spriteSourceSize"]; src=s["sourceSize"]
            image=atlas_image.crop((r["x"],r["y"],r["x"]+r["w"],r["y"]+r["h"]))
            poses.append((image,p["x"]-src["w"]//2,p["y"]-src["h"]//2))
        assert poses,key
        actions[action]=poses
    foot=2*BOSS_FOOT[key]
    special="summon" if key in ("20038","20085","sky_pontiff","hydra_king") else "charge"
    kinds=["ground","volley",special]
    js="""import {bossPose} from './src/bossPose.ts';
    const [kinds,count,foot,key]=JSON.parse(process.argv[1]);
    console.log(JSON.stringify(kinds.map(kind=>{
      const hold=kind==='charge'?.52:0;
      const samples=[-.88,-.60,-.32,-.10,0,hold+.09,hold+.18,hold+.26];
      return samples.map(t=>bossPose(kind,t,0,hold,count,3,foot,key));
    })));"""
    samples=json.loads(subprocess.check_output(["node","--experimental-strip-types","--input-type=module","-e",
                         js,json.dumps([kinds,len(actions["attack"]),foot,key])]))
    def draw(pose,stretch_x=1,stretch_y=1,angle=0):
        image,x,y=pose
        canvas=Image.new("RGBA",(780,780))
        if (stretch_x,stretch_y)!=(1,1):
            image=image.resize((max(1,round(image.width*stretch_x)),max(1,round(image.height*stretch_y))),Image.Resampling.LANCZOS)
        canvas.alpha_composite(image,(390+round(x*stretch_x),510+round((y-foot)*stretch_y)))
        if angle:canvas=canvas.rotate(-math.degrees(angle),Image.Resampling.BICUBIC,center=(390,510))
        return canvas
    idle=[draw(pose) for pose in actions["walk"]]
    casts=[[draw(actions["attack"][p["frame"]],p["width"],p["height"],p["angle"]) for p in seq] for seq in samples]
    return idle,dict(zip(kinds,casts))


def boss(key):
    idle,casts=boss_motion(key)
    sequence=idle+sum((phases+[idle[-1]] for phases in casts.values()),[])
    mask=Image.new("L",sequence[0].size)
    for pose in sequence:mask=ImageChops.lighter(mask,pose.getchannel("A"))
    box=mask.getbbox()
    scale=min(307/(box[2]-box[0]),185/(box[3]-box[1]))
    frames=[]
    for pose in sequence:
        im=pose.crop(box).resize((max(1,round((box[2]-box[0])*scale)),max(1,round((box[3]-box[1])*scale))),Image.Resampling.LANCZOS)
        canvas=Image.new("RGBA",SIZE)
        canvas.alpha_composite(im,(216-im.width//2,199-im.height))
        frames.append(canvas)
    export(frames,"m-boss-"+key,0,145)
    portrait=frames[0].crop(frames[0].getbbox());portrait.thumbnail((90,90),Image.Resampling.LANCZOS)
    portrait.save(OUT/("portrait-boss-"+key+".webp"),quality=91)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    if "--bosses" in sys.argv:
        for path in sorted((ROOT/"bosses").glob("*-cast.json")):
            boss(path.stem.removesuffix("-cast"))
        sys.exit(0)
    source=Path("src/config/skills.ts").read_text().split("export const WOOWL_PASSIVES")[0]
    for icon in re.findall(r"iconId: (\d+)",source):
        spell(int(icon))
    for path in sorted((ROOT/"monsters").glob("*@0.json")):
        monster(path.stem[2:].split("@")[0])

    for path in sorted((ROOT/"bosses").glob("*-cast.json")):
        boss(path.stem.removesuffix("-cast"))
