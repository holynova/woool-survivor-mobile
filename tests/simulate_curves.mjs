import { steer } from './pilot.mjs';
import { createServer } from 'vite';

async function runSimulation() {
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent'
  });

  const originalRandom = Math.random;
  try {
    const { GameEngine } = await server.ssrLoadModule('/src/game.ts');
    const { WOOWL_DIFFICULTY_CURVES } = await server.ssrLoadModule('/src/config/curves.ts');
    const { WOOWL_CHAPTERS } = await server.ssrLoadModule('/src/config/chapters.ts');

    const curves = Object.keys(WOOWL_DIFFICULTY_CURVES);
    const classes = ['warrior', 'wizard', 'taoist'];
    const allChapters = Object.keys(WOOWL_CHAPTERS);

    console.log('=== WOOOL SURVIVOR DIFFICULTY CURVE & CHAPTER SIMULATION ===\n');

    function simulateRun({ heroClass, chapterId, curveId, kiting, seed = 1, maxSimSec = 175 }) {
      let state = seed;
      Math.random = () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const eng = new GameEngine();
      eng.start(heroClass, chapterId, curveId);

      const dt = 0.05;
      let steps = 0;
      const maxSteps = Math.ceil(maxSimSec / dt);
      let minHpRatio = 1.0;
      let peakMonsters = 0;

      while ((eng.phase === 'battle' || eng.phase === 'level_up') && steps < maxSteps) {
        if (eng.phase === 'level_up') {
          const ranked = [...eng.upgradeChoices].sort((a, b) => {
            const score = c => (c.type === 'skill' ? 10 : 6) + (!c.isNew ? 4 : 1);
            return score(b) - score(a);
          });
          const preferred=ranked.find(c=>!c.swap);
          if (preferred) eng.selectUpgrade(preferred);
          else if (ranked.length) eng.keepLoadout();
          else break;
        }

        if (kiting) {
          if (steps % 5 === 0) steer(eng);
        } else {
          eng.setInput(0, 0);
        }

        eng.update(dt);
        eng.takeEffects();
        steps++;

        const ratio = eng.player.hp / Math.max(1, eng.player.maxHp);
        if (ratio < minHpRatio) minHpRatio = ratio;
        if (eng.monsters.length > peakMonsters) peakMonsters = eng.monsters.length;
      }

      return {
        phase: eng.phase,
        duration: Number(eng.clock.toFixed(1)),
        level: eng.player.level,
        kills: eng.player.kills,
        minHpPct: Math.round(minHpRatio * 100),
        peakMonsters
      };
    }

    // 1. Multi-trial stats across all 4 Curves (3 runs each for ch1 & ch3)
    console.log('--- 1. Multi-Run Curve Benchmark (Chapter 1 & 3, Active Kiting, 6 runs/curve) ---');
    const summaryByCurve = {};
    for (const curveId of curves) {
      let wins = 0;
      let totalKills = 0;
      let totalMinHp = 0;
      const runs = 6;
      for (let i = 0; i < runs; i++) {
        const cls = classes[i % classes.length];
        const ch = i < 3 ? 'sunset_island' : 'hot_desert';
        const res = simulateRun({ heroClass: cls, chapterId: ch, curveId, kiting: true, seed: i + 1 });
        const survived = res.phase === 'victory' || (res.phase === 'battle' && res.duration >= 170);
        if (survived) wins++;
        totalKills += res.kills;
        totalMinHp += res.minHpPct;
      }
      summaryByCurve[curveId] = {
        winRate: Math.round((wins / runs) * 100),
        avgKills: Math.round(totalKills / runs),
        avgMinHp: Math.round(totalMinHp / runs)
      };
      console.log(
        `[${curveId.padEnd(8)}] winRate=${summaryByCurve[curveId].winRate}% avgKills=${summaryByCurve[curveId].avgKills} avgMinHp=${summaryByCurve[curveId].avgMinHp}%`
      );
    }

    // 2. AFK vs Hell verification
    console.log('\n--- 2. Stationary AFK Stress Test ---');
    const afkHell = simulateRun({ heroClass: 'wizard', chapterId: 'sunset_island', curveId: 'hell', kiting: false });
    console.log(`[AFK hell] result=${afkHell.phase} t=${afkHell.duration}s kills=${afkHell.kills}`);
    if (afkHell.phase !== 'game_over') {
      throw new Error('Expected stationary AFK on Hell curve to result in game_over!');
    }

    // 3. All Chapters Playability Smoke Check
    console.log('\n--- 3. All Chapters Playability Check (Standard Curve) ---');
    for (const ch of allChapters) {
      const chapName = WOOWL_CHAPTERS[ch].name;
      const res = simulateRun({ heroClass: 'wizard', chapterId: ch, curveId: 'standard', kiting: true });
      console.log(
        `[${ch.padEnd(15)} ${chapName}] result=${res.phase.padEnd(8)} t=${res.duration}s lv=${res.level} kills=${res.kills} minHp=${res.minHpPct}% peakMob=${res.peakMonsters}`
      );
      if (res.kills < 35) {
        throw new Error(`Chapter ${ch} spawned too few killable enemies (${res.kills})`);
      }
    }

    if (summaryByCurve.casual.winRate < 80) {
      throw new Error(`Expected casual winRate >= 80%, got ${summaryByCurve.casual.winRate}%`);
    }
    if (summaryByCurve.surge.avgKills <= summaryByCurve.standard.avgKills * 0.9) {
      throw new Error('Expected surge curve to deliver denser horde kills than standard');
    }

    console.log('\nALL CURVE & CHAPTER ASSERTIONS PASSED.');
  } finally {
    Math.random = originalRandom;
    await server.close();
  }
}

runSimulation().catch((err) => {
  console.error(err);
  process.exit(1);
});
