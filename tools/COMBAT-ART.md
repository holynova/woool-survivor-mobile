# 战斗美术来源与重建

公用目录为 `public/assets/woool/`。服装、武器、首领动作在浏览器中直接解码。Python、原始图集和模型权重只在离线出图时使用。

| 目录 | 来源及处理 |
|---|---|
| `equipment/` | 从原项目使用的素材库提取三职业的 `res/role/plist` 和 `res/weapon/plist` 图层。每一职业拆成衣服和兵器两张图。保留各自的 512 像素枢轴和五个方向的全部站立、奔跑帧，另外三个方向镜像。初装身体继续使用 `heroes/`。 |
| `items/` | 原素材库的库存图标，缺少库存图标的档位从同款兵器或衣服动作图提取。 |
| `bosses/` | `20111` 保存铁甲刀卫兼容键，使用原版 `m_20036` 的铠甲守卫。`20038` 使用 `m_20053` 的眼镜蛇骨架，按鳞片明暗染碧。`20046` 在原动作上制作赤鬃与獠牙。六位首领使用原生多方向攻击帧，三头蛇王和通天教主在各自的八帧史料姿态上编排蓄势、出手和收招。所有动作保留脚底定位。每位首领的施放帧单独存为 `-cast` 图集。 |
| `codex/m-boss-*`、`codex/portrait-boss-*` | 使用相应首领在战斗中实际加载的图集生成演示及头像。 |
| `screenshots/v1.1/*-poses.webp` | 直接从发行图集生成的美术对照图。 |

素材来自 [ym-woool 原素材库](https://gitee.com/ym6745476/ym-woool)，与[原项目下载脚本](https://github.com/holynova/woool-survivor-game/blob/main/download_assets.mjs)使用的来源一致。首领超分辨率采用 [Real-ESRGAN 的 animevideov3 模型](https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0)。新增上游文件的 Git blob ID 固定在 `combat-art-sources.json`；下载脚本验证内容哈希，素材缓存可重新生成。

从项目根目录运行以下命令。临时原始素材和权重都存放在命令指定的缓存中。

```sh
uv run --python 3.12 --with pillow --with rectpack tools/build_equipment_art.py /tmp/woool-11-art --fetch
gh release download v0.2.5.0 -R xinntao/Real-ESRGAN -p realesr-animevideov3.pth -D /tmp/woool-11-art
uv run --python 3.12 --with torch --with pillow --with numpy --with scipy --with rectpack tools/build_battle_art.py /tmp/woool-11-art/realesr-animevideov3.pth /tmp/woool-11-art
uv run --with pillow tools/build_codex_art.py --bosses
uv run --with pillow --with rectpack tools/render_combat_art_proofs.py
node tests/boss.mjs
node tests/codex.mjs
```
