# 传奇世界幸存者 · 移动版

[1.1 手机开玩 / Play](https://xiaosang.cc/woool-survivor-mobile/next/) · [1.0.10 旧版](https://xiaosang.cc/woool-survivor-mobile/) · [玩法指南](PLAY-GUIDE.md) · [GitHub](https://github.com/holynova/woool-survivor-mobile)

战士、法师、道士，八章十分钟守关。单指拖动走位，角色自动出招。将主修技能升至五级觉醒，五分钟后选定流派，击败章节首领。新版首次打开时可读取本浏览器已有的旧版进度，之后单独存档。

直接体验两场首领战。点击「试招」从 9:58 入场，试玩独立于正式存档。[中州屋角 · 铁甲刀卫](https://xiaosang.cc/woool-survivor-mobile/next/?trial=guard) · [通天塔 · 通天教主](https://xiaosang.cc/woool-survivor-mobile/next/?trial=tower)

A mobile survival game with three classes and eight chapters. Drag to move, awaken skills at rank five, choose a build path and face the boss at ten minutes. The two encounter trials use temporary progress.

<img src="screenshots/v1.1/chapters.webp" width="440" alt="1.1 八章移动战斗截图 · Eight chapters in battle">
<img src="screenshots/qr.png" width="144" alt="扫码进入 1.1 · Scan to play 1.1">

## 本地运行 / Development

Node.js 22.12+

```sh
npm ci
npm run dev
```

## 测试与发布 / Test and deploy

1.1 分支 `gameplay/readability-1.1` 使用独立的 `woool-survivor-mobile-next` Worker，服务 `/woool-survivor-mobile/next/`。

```sh
npm test
npm run build
npx wrangler@4.128.0 deploy --config wrangler.jsonc
```

素材出处见[来源](PLAY-GUIDE.md#来源)。
