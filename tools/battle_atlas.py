"""Read original Cocos frames and pack portable, unrotated Phaser WebP atlases."""
from pathlib import Path
from dataclasses import dataclass
import hashlib
import json
import plistlib
import re
from PIL import Image
from rectpack import MaxRectsBlsf, newPacker

ROOT = Path("public/assets/woool")


@dataclass
class Pose:
    image: Image.Image
    left: int
    top: int
    size: tuple


def original_frames(cache, stem):
    for plist in sorted(cache.glob(stem+"@*.plist")):
        atlas = Image.open(plist.with_suffix(".png")).convert("RGBA")
        for name, spec in plistlib.loads(plist.read_bytes())["frames"].items():
            values = lambda key: tuple(map(int,re.findall(r'-?\d+', spec[key])))
            x, y, w, h = values("frame")
            left, top, _, _ = values("sourceColorRect")
            if spec["rotated"]:
                frame = atlas.crop((x,y,x+h,y+w)).transpose(Image.Transpose.ROTATE_90)
            else:
                frame = atlas.crop((x,y,x+w,y+h))
            yield name, Pose(frame,left,top,values("sourceSize"))


def phaser_frames(stem, ext):
    atlas = Image.open(stem.with_suffix(ext)).convert("RGBA")
    for name, spec in json.loads(stem.with_suffix(".json").read_text())["frames"].items():
        r, s, size = spec["frame"], spec["spriteSourceSize"], spec["sourceSize"]
        image = atlas.crop((r["x"],r["y"],r["x"]+r["w"],r["y"]+r["h"]))
        yield name, Pose(image,s["x"],s["y"],(size["w"],size["h"]))


def pack(poses, path, limit=2048):
    unique, names = {}, {}
    for name, pose in poses.items():
        key = (pose.image.size,hashlib.sha256(pose.image.tobytes()).digest())
        names[name] = key
        unique[key] = pose.image
    packer = newPacker(rotation=False,pack_algo=MaxRectsBlsf)
    for key, im in unique.items():
        packer.add_rect(im.width+4,im.height+4,key)
    packer.add_bin(limit,limit)
    packer.pack()
    rects = packer.rect_list()
    if len(rects)!=len(unique):
        raise ValueError(f"{path}: {len(rects)}/{len(unique)} fit on {limit}px")
    sheet = Image.new("RGBA",(max(x+w for _,x,_,w,_,_ in rects),max(y+h for _,_,y,_,h,_ in rects)))
    places = {}
    for _, x,y,w,h,key in rects:
        places[key] = dict(x=x+2,y=y+2,w=w-4,h=h-4)
        sheet.paste(unique[key],(x+2,y+2))
    meta = {}
    for name, pose in poses.items():
        meta[name] = dict(frame=places[names[name]],rotated=False,trimmed=True,
                          spriteSourceSize=dict(x=pose.left,y=pose.top,w=pose.image.width,h=pose.image.height),
                          sourceSize=dict(w=pose.size[0],h=pose.size[1]))
    path.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(path.with_suffix(".webp"),quality=92,method=5)
    path.with_suffix(".json").write_text(json.dumps(dict(frames=meta),separators=(',',':')))
    print(path.name,len(poses),sheet.size,flush=True)
