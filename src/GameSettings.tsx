import {useState} from 'react';
import {sound} from './audio';
import {setMotionPreference,motionPreference,type MotionPreference} from './motion';

export function GameSettings(){
  const [muted,setMuted]=useState(()=>sound.isMuted());
  const [monster,setMonster]=useState(()=>sound.monstersEnabled());
  const [levels,setLevels]=useState(()=>({music:sound.volume('music'),effects:sound.volume('effects')}));
  const [motion,setMotion]=useState(motionPreference);
  function changeMotion(next:MotionPreference){
    setMotionPreference(next);setMotion(next);
  }
  return <div className="settings">
    <div className="toggle-row"><span>总声音</span><button aria-pressed={!muted} onClick={()=>setMuted(sound.toggleMute())}>{muted?'已关闭':'已开启'}</button></div>
    {(['music','effects'] as const).map(channel=><label className="volume-row" key={channel}>
      <span>{channel==='music'?'音乐':'音效'}</span><input type="range" min="0" max="100" step="1" value={Math.round(levels[channel]*100)}
        onChange={e=>{const volume=Number(e.target.value)/100;sound.setVolume(channel,volume);setLevels(prev=>({...prev,[channel]:volume}));}}/>
      <output>{Math.round(levels[channel]*100)}%</output>
    </label>)}
    <div className="toggle-row"><span>怪物受击与死亡声</span><button aria-pressed={monster} onClick={()=>setMonster(sound.toggleMonsters())}>{monster?'已开启':'已关闭'}</button></div>
    <fieldset className="motion-choices"><legend>画面震动</legend>
      {([['system','跟随系统'],['reduced','关闭'],['full','开启']] as const).map(([key,label])=>
        <button key={key} aria-pressed={motion===key} onClick={()=>changeMotion(key)}>{label}</button>)}
    </fieldset>
  </div>;
}
