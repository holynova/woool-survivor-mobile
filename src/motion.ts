import {trialId} from './trial';

export type MotionPreference = 'system' | 'reduced' | 'full';
const key='woool.mobile.motion';
let preference:MotionPreference='system';
if(!trialId)try {
  const saved=localStorage.getItem(key);
  if(saved==='reduced'||saved==='full')preference=saved;
} catch {}
const media=typeof window!=='undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : undefined;

export const motionPreference=()=>preference;
export const reducedMotion=()=>preference==='system' ? !!media?.matches : preference==='reduced';
export function setMotionPreference(value:MotionPreference) {
  preference=value;
  if(!trialId)try{localStorage.setItem(key,value);}catch{}
}
