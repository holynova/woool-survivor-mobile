"""Bake small variants from the shipped paintings. Run from the repository root with Pillow."""
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageChops, ImageOps

ROOT = Path('public/assets/woool')
LAND = ROOT / 'terrain'


def worn_basalt():
    # Keep real stone detail. Break up the periodic red seam with irregular,
    # overlapping patches sampled at other positions in the same painting.
    tile = Image.open(LAND / 'basalt.webp').convert('RGB')
    w, h = tile.size
    out = Image.new('RGB', (w*2, h*2))
    for x in (0, w):
        for y in (0, h):
            out.paste(tile, (x,y))
    rng = random.Random(7103)
    for _ in range(45):
        pw, ph = rng.randrange(100, 215), rng.randrange(56, 140)
        x, y = rng.randrange(out.width), rng.randrange(out.height)
        sx, sy = rng.randrange(w-pw), rng.randrange(h-ph)
        patch = tile.crop((sx, sy, sx+pw, sy+ph))
        if rng.random()<.55:
            patch = ImageOps.mirror(patch)
        mask = Image.new('L', (pw,ph))
        ImageDraw.Draw(mask).ellipse((8,6,pw-8,ph-6),fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(5))
        for dx in (0,-out.width):
            for dy in (0,-out.height):
                out.paste(patch,(x+dx,y+dy),mask)
    out.save(LAND/'basalt_worn.webp',quality=90,method=5)


def frosted_snag():
    tree=Image.open(LAND/'dead_tree.webp').convert('RGBA')
    alpha=tree.getchannel('A')
    # Snow accumulates on upward-facing branch edges, leaving dark bark below.
    shifted=Image.new('L',alpha.size)
    shifted.paste(alpha,(0,4))
    edge=ImageChops.subtract(alpha,shifted).filter(ImageFilter.GaussianBlur(.7))
    bark=ImageEnhance.Color(tree.convert('RGB')).enhance(.38)
    image=Image.composite(Image.new('RGB',tree.size,(225,229,222)),bark,edge)
    image.putalpha(alpha)
    image.save(LAND/'snow_snag.webp',quality=91,method=5)


def coin_string():
    coin=Image.open(ROOT/'items/gold_coin_1.png').convert('RGBA')
    coin=coin.crop(coin.getbbox()).resize((34,23),Image.Resampling.LANCZOS)
    sheet=Image.new('RGBA',(130,85))
    draw=ImageDraw.Draw(sheet)
    points=[(12,61),(22,34),(79,22),(108,31),(113,51),(96,64),(32,62)]
    draw.line(points,fill='#522c20',width=6,joint='curve')
    draw.line(points,fill='#b36638',width=2,joint='curve')
    for i in range(6):
        x,y=17+i*14,35-round(8*math.sin(i*.62))
        sheet.alpha_composite(coin,(x,y))
        draw.rectangle((x+14,y+9,x+19,y+12),fill='#603b21')
    sheet.resize((40,26),Image.Resampling.LANCZOS).save(ROOT/'items/coin_string.webp',lossless=True)


if __name__=='__main__':
    worn_basalt()
    frosted_snag()
    coin_string()
    level_up = ROOT / "effects/level_up@0.png"
    Image.open(level_up).save(level_up.with_suffix(".webp"), quality=90, method=6)
