"""uv run --with pillow --with rectpack tools/build_equipment_art.py /tmp/woool-art
Download original art using --fetch. The source list pins the original Git blob IDs.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import shutil
from PIL import Image
from pathlib import Path
from urllib.request import urlopen
from battle_atlas import ROOT, original_frames, pack

ROLES = {
    "warrior": ([5110503,5110505],[5010101,5010104,5010107]),
    "wizard": ([5120505,5120507],[5010101,5020103,5020107]),
    "taoist": ([5130504,5130507],[5010101,5030104,5030107]),
}


def fetch(cache):
    cache.mkdir(exist_ok=True,parents=True)
    sources=json.loads(Path(__file__).with_name("combat-art-sources.json").read_text())
    def get(item):
        name, git_id = item
        path=cache/name
        def valid(data):
            return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()==git_id
        if path.exists() and valid(path.read_bytes()): return
        url="https://gitee.com/api/v5/repos/ym6745476/ym-woool/git/blobs/"+git_id
        with urlopen(url,timeout=30) as response: data=base64.b64decode(json.load(response)["content"])
        if not valid(data): raise ValueError("Invalid source "+name)
        path.write_bytes(data)
    with ThreadPoolExecutor(max_workers=4) as pool: list(pool.map(get,sources.items()))


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cache",type=Path);parser.add_argument("--fetch",action="store_true")
    args=parser.parse_args()
    if args.fetch: fetch(args.cache)
    for path in args.cache.glob("[0-9]*.png"):
        if path.name in json.loads(Path(__file__).with_name("combat-art-sources.json").read_text()):
            shutil.copyfile(path,ROOT/"items"/path.name)
    # These two starter robes share a pixel-identical upstream inventory icon.
    shutil.copyfile(ROOT/"items/5120503.png",ROOT/"items/5130503.png")
    for role,(clothes,weapons) in ROLES.items():
        for prefix,ids in (("r",clothes),("w",weapons)):
            poses={}
            for tier, source in enumerate(ids,start=1 if prefix=="r" else 0):
                group={}
                for name,pose in original_frames(args.cache,f"{prefix}_{source}"):
                    _,_,action,frame = name.split("/")
                    if action in ("stand","run"):
                        group[f"{prefix}{tier}/{action}/{frame}"]=pose
                if len(group)!=80: raise ValueError((source,len(group)))
                poses.update(group)
                if prefix=="r" and source in (5110503,5130507):
                    image=group[f"r{tier}/stand/40000.png"].image.copy()
                    alpha=image.getchannel("A").point(lambda a:a if a>148 else 0)
                    image.putalpha(alpha);image=image.crop(alpha.getbbox())
                    # Collar-to-hem portrait from precisely this equipped suit.
                    image=image.crop((0,round(image.height*.24),image.width,round(image.height*.86)))
                    image.thumbnail((53,53),Image.Resampling.LANCZOS)
                    icon=Image.new("RGBA",(60,60))
                    icon.alpha_composite(image,((60-image.width)//2,(60-image.height)//2))
                    icon.save(ROOT/"items"/(str(source)+".png"))
                if prefix=="w" and tier==2:
                    image=group["w2/stand/30000.png"].image.copy()
                    # Inventory crops omit the semi-transparent projected ground shadow.
                    alpha=image.getchannel("A").point(lambda a:a if a>135 else 0)
                    image.putalpha(alpha);image=image.crop(alpha.getbbox())
                    image.thumbnail((53,53),Image.Resampling.LANCZOS)
                    icon=Image.new("RGBA",(60,60))
                    icon.alpha_composite(image,((60-image.width)//2,(60-image.height)//2))
                    icon.save(ROOT/"items"/(str(source)+".png"))
            pack(poses,ROOT/"equipment"/(role+"-"+prefix))
