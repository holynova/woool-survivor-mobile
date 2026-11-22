"""Build 2× battle art from original walk frames. Run from the repository root.

gh release download v0.2.5.0 -R xinntao/Real-ESRGAN -p realesr-animevideov3.pth -D /tmp
uv run --python 3.12 --with torch --with numpy --with scipy --with pillow --with rectpack \
  tools/build_battle_art.py /tmp/realesr-animevideov3.pth /tmp/woool-art

Run build_equipment_art.py with --fetch first. Each chapter ships separate walk and cast sheets.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw
from battle_atlas import ROOT, Pose, original_frames, phaser_frames, pack
from scipy.ndimage import distance_transform_edt
from torch import nn
from torch.nn import functional as F

SOURCE = Path("public/assets/woool/monsters")
OUTPUT = Path("public/assets/woool/bosses")
WEIGHT_HASH = "b8a8376811077954d82ca3fcf476f1ac3da3e8a68a4f4d71363008000a18b75d"


def load_model(weights, device):
    if hashlib.sha256(weights.read_bytes()).hexdigest() != WEIGHT_HASH:
        raise ValueError("Unexpected weights; use the pinned animevideov3 release")
    layers = []
    for i in range(17):
        layers.extend([nn.Conv2d(3 if i == 0 else 64, 64, 3, padding=1), nn.PReLU(64)])
    layers.append(nn.Conv2d(64, 48, 3, padding=1))
    model = nn.Sequential(*layers)
    state = torch.load(weights, weights_only=True, map_location="cpu")["params"]
    model.load_state_dict({k.removeprefix("body."): v for k, v in state.items()})
    return model.to(device).eval()


@torch.inference_mode()
def restore(frame, model, device):
    rgba = np.asarray(frame.convert("RGBA"))
    alpha = rgba[:, :, 3]
    # Extend subject colours into transparency before inference to avoid dark fringe.
    iy, ix = distance_transform_edt(alpha < 128, return_distances=False, return_indices=True)
    rgb = np.where((alpha < 128)[:, :, None], rgba[iy, ix, :3], rgba[:, :, :3])
    x = torch.from_numpy(rgb.copy()).permute(2, 0, 1).unsqueeze(0).float().to(device) / 255
    x = F.pad(x, (8, 8, 8, 8), mode="replicate")
    y = F.pixel_shuffle(model(x), 4) + F.interpolate(x, scale_factor=4, mode="nearest")
    restored = (y[0, :, 32:-32, 32:-32].clamp(0, 1).permute(1, 2, 0)*255).round().byte().cpu().numpy()
    size = (frame.width*2, frame.height*2)
    image = Image.fromarray(restored).resize(size, Image.Resampling.LANCZOS)
    image.putalpha(frame.getchannel("A").resize(size, Image.Resampling.LANCZOS))
    return image



def palette(image, key):
    """Retain the source luminance, baked highlights, transparent shadows and fur texture."""
    a = np.array(image)
    rgb = a[:,:,:3].astype(float)
    r,g,b = rgb.transpose(2,0,1)
    if key=="20046":
        mask = (a[:,:,3]>85) & (r>g*1.10) & (r>b*1.12)
        luma=rgb @ np.array([.30,.58,.12])/255
        for i,(dark,mid,light) in enumerate([(22,108,206),(13,45,115),(12,26,59)]):
            a[:,:,i][mask]=np.interp(luma[mask],[0,.56,1],[dark,mid,light]).astype("uint8")
    elif key=="20038":
        # Bronze highlights on the hood stay warm; the linked scales become green malachite.
        mask=(a[:,:,3]>100)&(r>g*1.18)&(g>b*.98)
        y=rgb @ np.array([.3,.58,.12])/255
        for i,(low,mid,hi) in enumerate([(6,39,161),(21,135,213),(20,97,147)]):
            a[:,:,i][mask]=np.interp(y[mask],[0,.46,1],[low,mid,hi]).astype("uint8")
    return Image.fromarray(a)


def tusker(image, direction):
    # Curved pairs of ivory tusks follow the snout. The back bristles run along
    # the lit dorsal contour, measured per frame so they follow the original gait.
    rgb=np.asarray(image).astype(float)
    r,g,b,a=rgb.transpose(2,0,1)
    hide=(a>130)&(r>g*1.18)&(r>b*1.25)
    ys,xs=np.nonzero(hide)
    if not len(xs):return image
    x0,x1=int(xs.min()),int(xs.max()); y0,y1=int(ys.min()),int(ys.max())
    w,h=x1-x0,y1-y0; path=ImageDraw.Draw(image)
    for x in range(round(x0+w*.19),round(x0+w*.70),3):
        col=np.flatnonzero(hide[:,x])
        if not len(col):continue
        y=int(col[0]); height=3+(x%11)*.47
        path.polygon([(x-2,y+5),(x-4,y-height),(x+3,y+3)], fill=(93+x%24,37+x%11,22,255))
        path.line([(x-3,y-height+1),(x,y+2)],fill=(170,83,42,255),width=1)
    if direction in (2,3,4):
        for side in (-1,1):
            if direction==2 and side<0:continue
            if direction==2: x,y=x0+w*.94, y0+h*.56
            elif direction==3: x,y=x0+w*(.80+.08*side),y0+h*(.73+.025*side)
            else:x,y=x0+w*(.52+.165*side),y0+h*.76
            tip=(x+(8 if direction==2 else side*7), y-12)
            path.polygon([(x-3,y),(x+2,y+3),(tip[0]+2,tip[1]+5),tip,(x+1,y-3)],fill=(222,195,137,255))
            path.line([(x+1,y+1),(tip[0],tip[1]+1)],fill=(255,231,179,255),width=1)
    return image


def build(key, model, device, cache):
    substitute={"20111":("m_20036",.70,47,34),"20038":("m_20053",.71,42,53)}
    pose_scale=1
    if key in substitute:
        stem,pose_scale,native_foot,rig_foot=substitute[key]
        original=list(original_frames(cache,stem))
    else:
        original=list(phaser_frames(SOURCE/("m_"+key+"@0"),".png"))
    sheets={"walk":{},"attack":{}}
    for name,pose in original:
        _,action,step=name.split("/")
        if action not in sheets:continue
        image=restore(pose.image, model, device)
        image=palette(image,key)
        if key=="20046":image=tusker(image,int(step[0]))
        left,top=pose.left*2,pose.top*2
        size=tuple(s*2 for s in pose.size)
        if key in substitute:
            image=image.resize(tuple(round(v*pose_scale) for v in image.size),Image.Resampling.LANCZOS)
            left=round(384+(left-size[0]/2)*pose_scale)
            top=round(384+(top-size[1]/2-2*native_foot)*pose_scale+rig_foot*2)
            size=(768,768)
        sheets[action][key+"/"+action+"/"+step]=Pose(image,left,top,size)
    if not sheets["attack"]:
        # The two archival leaders have a single eight-pose source angle. Give
        # the cast an authored planted anticipation, forward strike, then recovery.
        angles = [2,4,7,10,-9,-6,-3,0] if key=="sky_pontiff" else [0,2,5,6,-5,-3,-1,0]
        walk=[pose for _,pose in sorted(sheets["walk"].items())]
        for i,angle in enumerate(angles):
            p=walk[[0,1,2,3,5,6,7,0][i]]
            canvas=Image.new("RGBA",p.size)
            canvas.paste(p.image,(p.left,p.top))
            feet=(p.size[0]/2,p.size[1]/2+42)
            posed=canvas.rotate(angle,Image.Resampling.BICUBIC,center=feet)
            box=posed.getbbox()
            sheets["attack"][f"{key}/attack/3{i:04}.png"]=Pose(posed.crop(box),box[0],box[1],p.size)
    for action,poses in sheets.items():
        pack(poses,OUTPUT/(key+("-cast" if action=="attack" else "")))


def build_terrain(model,device):
    terrain = Path("public/assets/woool/terrain")
    pavilion = Image.open(terrain / "ancient_pavilion.webp").convert("RGBA")
    restore(pavilion, model, device).save(terrain / "ancient_pavilion_hd.webp", quality=93, method=5)
    # The original lamp has grass burnt into its stone plinth. Neutralise the
    # green pixels on the bottom quarter before placing it on town/tower paving.
    lamp = np.array(Image.open(terrain / "stone_lantern.webp").convert("RGBA"))
    rgb = lamp[:, :, :3].astype(float)
    r,g,b = rgb.transpose(2,0,1)
    moss = (g>b*1.2) & (g>r*.92) & (np.indices(g.shape)[0] > .72*lamp.shape[0])
    luma = rgb @ np.array([.299, .587, .114])
    rgb[moss] = luma[moss,None]*np.array([.90,.85,.74])
    lamp[:,:,:3]=rgb.clip(0,255).astype("uint8")
    Image.fromarray(lamp).save(terrain / "stone_lantern_paving.webp", lossless=True)


if __name__ == "__main__":
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    torch.set_num_threads(4)
    model = load_model(Path(sys.argv[1]), device)
    OUTPUT.mkdir(exist_ok=True)
    if "--terrain" in sys.argv:
        build_terrain(model,device)
        sys.exit(0)
    cache=Path(sys.argv[2])
    for key in sys.argv[3:] or ("20111","20038","20046","20082","20072","sky_pontiff","hydra_king","20085"):
        build(key,model,device,cache)
