import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
test('the Host away flag is a shared overlay and never becomes a main-scene transition', async () => {
 const shared=JSON.parse(await readFile(new URL('../defaults.json',import.meta.url),'utf8'));
 const normal=JSON.parse(await readFile(new URL('../defaults/ultrawide.json',import.meta.url),'utf8'));
 const away=JSON.parse(await readFile(new URL('../defaults/away.json',import.meta.url),'utf8'));
 const fixture={client:null,shared,context:{presetId:'latenite',sceneId:'latenite__ultrawide',preview:false},selections:[],parameters:{
  latenite__ultrawide:structuredClone(normal),latenite__fullscreen:{...structuredClone(normal),obsSceneName:'Camera',titles:{english:['Fullscreen'],chinese:['全屏']}},
  latenite__away:{...away,obsSceneName:'Break'},
 }};
 class Client {
  handlers=new Map();onState(callback){this.stateCallback=callback;}
  on(topic,callback){const values=this.handlers.get(topic)||[];values.push(callback);this.handlers.set(topic,values);return()=>{};}
  emit(topic,value){for(const callback of this.handlers.get(topic)||[])callback(value);}
  settings(scope,id){return{read:async()=>structuredClone(scope==='preset'?fixture.shared:fixture.parameters[id])};}
  selectScene(id,options){fixture.selections.push({id,...options});return Promise.resolve();}
  start(){this.emit('connection',true);}stop(){this.stopped=true;}
 }
 const oldFixture=globalThis.__presetTest,oldLocation=globalThis.location;
 globalThis.__presetTest=fixture;globalThis.location={origin:'http://127.0.0.1:5280',protocol:'http:'};
 fixture.make=()=>fixture.client=new Client();
 const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 const sdk='export const createClient=()=>globalThis.__presetTest.make();export const getSceneContext=()=>globalThis.__presetTest.context;export const request=()=>Promise.resolve();';
 const binding=url(stripTypeScriptTypes(await readFile(new URL('../source/src/obs-bindings.ts',import.meta.url),'utf8'),{mode:'transform'}));
 let source=await readFile(new URL('../source/src/host-client.ts',import.meta.url),'utf8');
 source=source.replace("const sdkUrl = '/sdk/streamui.js';",'const sdkUrl = '+JSON.stringify(url(sdk))+';').replace("from './obs-bindings.ts'","from "+JSON.stringify(binding));
 try {
  const {host}=await import(url(stripTypeScriptTypes(source,{mode:'transform'})));
  const state={apiVersion:2,scenes:[{id:'latenite__ultrawide',view:'21:9',role:'scene'},{id:'latenite__fullscreen',view:'16:9',role:'scene'},{id:'latenite__away',view:'away',role:'overlay'}],
   scene:{activeId:'latenite__ultrawide',previousId:null,playback:{id:'normal-one',startedAt:Date.now(),animate:true},revision:1},plugins:[],outputUrl:'http://127.0.0.1:5280',configUrl:'http://127.0.0.1:5281',startup:false,preview:false};
  host.start();fixture.client.stateCallback(state);await new Promise(setImmediate);
  assert.deepEqual(host.state.config.titles,normal.titles);assert.equal(host.state.transition.animate,true);
  const initial=structuredClone(state.scene);
  fixture.shared.controls.away=true;fixture.client.emit('preset.settingsChanged',{id:'latenite'});await new Promise(setImmediate);
  assert.equal(host.state.config.away.enabled,true);assert.equal(host.state.transition,null);assert.deepEqual(state.scene,initial);
  state.scene={activeId:'latenite__fullscreen',previousId:'latenite__ultrawide',playback:{id:'covered-change',startedAt:Date.now(),animate:true},revision:2};
  fixture.client.stateCallback(state);
  assert.equal(host.state.config.layoutMode,'16:9');assert.equal(host.state.config.away.enabled,true);assert.equal(host.state.transition,null);
  fixture.shared.controls.away=false;fixture.client.emit('preset.settingsChanged',{id:'latenite'});await new Promise(setImmediate);
  assert.equal(host.state.config.away.enabled,false);assert.equal(host.state.config.titles.english[0],'Fullscreen');assert.equal(host.state.transition.animate,false);
  fixture.client.stateCallback(state);assert.equal(host.state.transition.animate,false,'a later state or visibility resume cannot replay a covered cue');
  state.scene.playback={id:'fresh-normal',startedAt:Date.now(),animate:true};fixture.client.stateCallback(state);assert.equal(host.state.transition.animate,true);
  fixture.parameters.latenite__away.texts=['ONE','TWO','THREE'];fixture.client.emit('scene.settingsChanged',{id:'latenite__away'});await new Promise(setImmediate);
  assert.deepEqual(host.state.config.away.texts,['ONE','TWO','THREE']);
  fixture.client.emit('plugin.obs-scenes.scene-changed',{id:'break',name:'Break',startedAt:Date.now()});assert.deepEqual(fixture.selections,[],'away cannot be activated by an OBS scene');
  fixture.client.emit('plugin.obs-scenes.scene-changed',{id:'camera',name:'Camera',startedAt:Date.now()});assert.equal(fixture.selections[0].id,'latenite__fullscreen');
  const messages=[];host.addEventListener('chat',event=>messages.push(event.detail));
  fixture.client.emit('plugin.laplace.chat.message',{id:'one',kind:'message',platform:'bilibili',timestamp:1700000000000,user:{id:'42',name:'观众',level:12,medalName:null,medalLevel:null},text:'Hello',gift:null,payment:null});
  assert.equal(messages[0].username,'观众');host.stop();assert.ok(fixture.client.stopped);
 } finally {globalThis.__presetTest=oldFixture;globalThis.location=oldLocation;}
});
