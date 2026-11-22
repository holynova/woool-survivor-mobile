import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
const samples=[], tones=[], music=[], requests=[], store=new Map();

class AudioNode {
  connect(target){this.output=target;}
  disconnect(){}
  start(){}
  stop(){this.onended?.();}
}
function parameter(value) {
  const events=[];
  return {value,events,cancelScheduledValues(){},
    setValueAtTime:(v,t)=>events.push([v,t]),linearRampToValueAtTime:(v,t)=>events.push([v,t]),
    exponentialRampToValueAtTime:(v,t)=>events.push([v,t])};
}
class TestContext {
  state='running';currentTime=5;destination={};
  createGain(){return Object.assign(new AudioNode(),{gain:parameter(1)});}
  createBufferSource(){const source=new AudioNode();samples.push(source);return source;}
  createOscillator(){const source=Object.assign(new AudioNode(),{frequency:parameter(0)});tones.push(source);return source;}
  decodeAudioData(data){return Promise.resolve(data);}
}

try {
  globalThis.window={AudioContext:TestContext,matchMedia:()=>({matches:true})};
  globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  globalThis.Audio=class {
    volume=1;paused=true;
    constructor(){music.push(this);}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
    canPlayType(){return 'probably';}
  };
  globalThis.fetch=(url,{signal})=>new Promise((resolve,reject)=>{
    const key=url.split('/').at(-1).replace('.wav','');
    const finish=()=>resolve({ok:true,arrayBuffer:()=>Promise.resolve(key)});
    requests.push({key,signal,finish});
    signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
  });
  const {sound}=await server.ssrLoadModule('/src/audio.ts');
  const warrior=sound.init('warrior',['attack_slash']);
  const wizard=sound.init('wizard',['fireball']);
  assert.ok(requests.find(r=>r.key==='skill_slash').signal.aborted,'cancel old class');
  assert.equal(requests.filter(r=>r.key==='monster_die').length,1,'share common in-flight sound');
  assert.ok(!requests.some(r=>r.key==='skill_lightning'),'defer unowned spell');
  for(const request of requests)request.finish();
  await Promise.all([warrior,wizard]);
  const later=sound.prepareSkills(['lightning_strike','lightning_strike']);
  assert.equal(requests.filter(r=>r.key==='skill_lightning').length,1);
  requests.at(-1).finish();await later;

  const {performance}=globalThis;
  let now=1000;
  Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
  sound.setVolume('effects',.7);sound.setVolume('music',.4);
  sound.playBgm('battle','heaven_tower');
  const track=music[0];assert.equal(track.volume,.4);
  for(let i=0;i<8;i++){now+=100;sound.play('monster_hurt');}
  assert.equal(samples.length,3,'monster voice cap');
  sound.play('player_hurt');
  assert.equal(samples.length,4);
  assert.notEqual(samples[0].output.output,samples[3].output.output,'dedicated player feedback');
  const mix=samples[0].output.output, master=mix.output, patterns=new Set();
  for(const kind of ['charge','ground','volley','summon']) {
    const from=tones.length;sound.playThreat(kind);
    patterns.add(JSON.stringify(tones.slice(from).map(node=>node.frequency.events)));
  }
  assert.equal(patterns.size,4);
  assert.ok(track.volume<.4 && mix.gain.events.some(([v])=>v===.32));
  sound.setVolume('music',.3);
  await new Promise(resolve=>setTimeout(resolve,740));assert.equal(track.volume,.3);
  sound.toggleMute();assert.equal(master.gain.value,0);
  const count=tones.length;sound.playThreat('charge');assert.equal(tones.length,count);
  sound.toggleMute();assert.equal(master.gain.value,.7);
  assert.equal(store.get('woool.mobile.volume.effects'),'0.7');
  Object.defineProperty(globalThis,'performance',{value:performance,configurable:true});

  const {reducedMotion,setMotionPreference}=await server.ssrLoadModule('/src/motion.ts');
  assert.equal(reducedMotion(),true);setMotionPreference('full');assert.equal(reducedMotion(),false);
  setMotionPreference('system');assert.equal(reducedMotion(),true);
  const {GameSettings}=await server.ssrLoadModule('/src/GameSettings.tsx');
  const settings=renderToStaticMarkup(React.createElement(GameSettings));
  assert.equal(settings.match(/type="range"/g).length,2);
  assert.ok(settings.includes('跟随系统')&&settings.includes('怪物受击与死亡声'));
  const {trialFrom,prepareTrial,trials}=await server.ssrLoadModule('/src/trial.ts');
  assert.equal(trialFrom('?trial=invalid'),null);
  assert.equal(trialFrom(''),null);
  const {GameEngine}=await server.ssrLoadModule('/src/game.ts');
  for(const id of ['guard','tower']) {
    assert.equal(trialFrom('?trial='+id),id);
    const engine=new GameEngine();
    const {chapter,role}=trials[id];
    engine.start(role,chapter,'standard');
    const detach=prepareTrial(engine,id);
    assert.equal(engine.clock,598);
    assert.equal(engine.activeSkills.length,3);
    assert.equal(engine.terrain.settle({...engine.player},13),false);
    for(let i=0;i<100&&!engine.getActiveBoss()?.bossCast;i++)engine.update(.08);
    const boss=engine.getActiveBoss();
    assert.ok(boss && engine.clock>=600 && engine.clock<607);
    assert.equal(boss.bossCast?.kind,id==='guard'?'charge':'ground');
    detach();
  }
  console.log('Independent 9:58 trials reach their chapter boss and signature tell.');
  console.log('Role-scoped audio loading, monster voice cap, distinct threat cues, ducking, mute, volumes and motion settings verified.');
} finally {
  await server.close();
}
