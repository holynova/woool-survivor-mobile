import type { GameEngine } from './game';
import { WOOWL_CHAPTERS } from './config/chapters';
import { WOOWL_DIFFICULTY_CURVES } from './config/curves';
import { WOOWL_SKILLS, WOOWL_PASSIVES } from './config/skills';
import { freshTraining, trainingCost, type Training } from './config/equipment';

export type Checkpoint = ReturnType<GameEngine['snapshot']>;
type Result = 'victory' | 'game_over' | 'retired';
export interface RecordEntry {
  id: string; chapter: string; role: Checkpoint['heroClass']; difficulty: Checkpoint['difficultyId'];
  deathCause?:Checkpoint['deathCause']; build?:string; metrics?:Checkpoint['metrics'];
  outcome: Result; seconds: number; level: number; kills: number; coins: number;
}
export interface Journal {
  version: 1; bank: number; training: Training; recent: RecordEntry[];
  cleared: string[]; saved: Checkpoint | null;
}
export const journalKey = 'woool.mobile.journal.v1.1';
const stableJournalKey='woool.mobile.journal.v1';
const fresh = (): Journal => ({version: 1, bank: 0, training: freshTraining(), recent: [], cleared: [], saved: null});
const nonnegative = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function validSave(s: Checkpoint) {
  return s && !!s.runId && Object.hasOwn(WOOWL_CHAPTERS,s.chapterId) && Object.hasOwn(WOOWL_DIFFICULTY_CURVES,s.difficultyId)
    && ['warrior','wizard','taoist'].includes(s.heroClass) && ['level_up','paused','battle'].includes(s.phase)
    && nonnegative(s.clock) && nonnegative(s.nextEntityId) && nonnegative(s.player?.hp) && s.player.maxHp > 0
    && Number.isFinite(s.player.x) && Number.isFinite(s.player.y) && s.player.maxExp > 0
    && Array.isArray(s.activeSkills) && s.activeSkills.length > 0 && s.activeSkills.every(a => Object.hasOwn(WOOWL_SKILLS,a.id))
    && Array.isArray(s.activePassives) && s.activePassives.every(a => Object.hasOwn(WOOWL_PASSIVES,a.id))
    && [s.monsters,s.minions,s.drops,s.milestones,s.dangers,s.upgradeChoices].every(Array.isArray)
    && (s.phase !== 'level_up' || s.upgradeChoices.length > 0)
    && [s.equipment?.weapon,s.equipment?.armor].every(rank => Number.isInteger(rank) && rank >= 0 && rank <= 4)
    && Object.keys(freshTraining()).every(k => nonnegative(s.training?.[k as keyof Training]));
}
export function readJournal(): Journal {
  try {
    const own=localStorage.getItem(journalKey);
    const raw = own??localStorage.getItem(stableJournalKey);
    if (!raw) return fresh();
    const j: Journal = JSON.parse(raw);
    if (j.version !== 1 || !nonnegative(j.bank) || !Array.isArray(j.recent) || !Array.isArray(j.cleared)
      || !Object.keys(freshTraining()).every(k => nonnegative(j.training?.[k as keyof Training]))) return fresh();
    try {
      if (j.saved && !validSave(j.saved)) j.saved = null;
    } catch { j.saved = null; }
    if(own===null)writeJournal(j);
    return j;
  } catch { return fresh(); }
}
export function writeJournal(j: Journal) {
  try { localStorage.setItem(journalKey, JSON.stringify(j)); return true; }
  catch { return false; }
}
export function finishRun(j: Journal, game: GameEngine, outcome: Result): Journal {
  if (j.recent.some(r => r.id === game.runId)) return j;
  const main=game.activeSkills.slice().sort((a,b)=>b.level-a.level).slice(0,2).map(s=>WOOWL_SKILLS[s.id].name+' '+s.level+'级');
  const build=[game.pathName,...main].filter(Boolean).join(' · ');
  const record = {build,metrics:{...game.metrics},deathCause:outcome==='game_over'?game.deathCause:null,id: game.runId, chapter: game.chapterId, role: game.heroClass, difficulty: game.difficultyId,
    outcome, seconds: Math.floor(game.clock), level: game.player.level, kills: game.player.kills, coins: game.player.gold};
  const cleared = outcome === 'victory' ? [...new Set([...j.cleared,game.chapterId])] : j.cleared;
  return {...j, saved: null, bank: j.bank + record.coins, recent: [record,...j.recent].slice(0,24), cleared};
}
export function train(j: Journal, id: keyof Training) {
  const rank = j.training[id], cost = trainingCost(rank);
  if (rank >= 5 || j.bank < cost) return j;
  return {...j, bank: j.bank-cost, training: {...j.training, [id]: rank+1}};
}
