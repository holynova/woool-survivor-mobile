"""Build 2× battle art from original walk frames. Run from the repository root.

gh release download v0.2.5.0 -R xinntao/Real-ESRGAN -p realesr-animevideov3.pth -D /tmp
uv run --python 3.12 --with torch --with numpy --with scipy --with pillow --with rectpack \
  tools/build_battle_art.py /tmp/realesr-animevideov3.pth

Only the resulting chapter atlas is shipped to a player's browser.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from rectpack import newPacker, MaxRectsBlsf
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


def build(key, model, device):
    stem = SOURCE / ("m_" + key + "@0")
    original = Image.open(stem.with_suffix(".png")).convert("RGBA")
    frames = json.loads(stem.with_suffix(".json").read_text())["frames"]
    frames = {k: v for k, v in frames.items() if "/walk/" in k}
    packer = newPacker(rotation=False, pack_algo=MaxRectsBlsf)
    for name, spec in frames.items():
        r = spec["frame"]
        assert not spec["rotated"]
        packer.add_rect(r["w"]*2+4, r["h"]*2+4, name)
    packer.add_bin(2048, 2048)
    packer.pack()
    layout = packer.rect_list()
    assert len(layout) == len(frames), key
    sheet = Image.new("RGBA", (max(x+w for _, x, _, w, _, _ in layout),
                               max(y+h for _, _, y, _, h, _ in layout)))
    for _, x, y, w, h, name in layout:
        spec = frames[name]
        r = spec["frame"]
        frame = original.crop((r["x"], r["y"], r["x"]+r["w"], r["y"]+r["h"]))
        sheet.paste(restore(frame, model, device), (x+2, y+2))
        spec["frame"] = dict(x=x+2, y=y+2, w=w-4, h=h-4)
        for field in ("sourceSize", "spriteSourceSize"):
            spec[field] = {k:v*2 for k,v in spec[field].items()}
    sheet.save(OUTPUT / (key+".webp"), quality=92, method=5)
    (OUTPUT / (key+".json")).write_text(json.dumps({"frames": frames}, separators=(",", ":")))
    print(key, len(frames), sheet.size, flush=True)


if __name__ == "__main__":
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    torch.set_num_threads(4)
    model = load_model(Path(sys.argv[1]), device)
    OUTPUT.mkdir(exist_ok=True)
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
    for key in ("20111", "sky_pontiff", "20082", "20046", "20038", "20072", "hydra_king", "20085"):
        build(key, model, device)
