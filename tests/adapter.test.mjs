import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
test('the preset owns scene text, away presentation and capability adapters', async () => {
 const shared=JSON.parse(await readFile(new URL('../defaults.json',import.meta.url),'utf8'));
 const normal=JSON.parse(await readFile(new URL('../defaults/ultrawide.json',import.meta.url),'utf8'));
 const away=JSON.parse(await readFile(new URL('../defaults/away.json',import.meta.url),'utf8'));
 const fixture={client:null,context:{presetId:'latenite',sceneId:'latenite__ultrawide',preview:true},parameters:{latenite__ultrawide:structuredClone(normal),latenite__fullscreen:{...structuredClone(normal),titles:{english:['Fullscreen'],chinese:['全屏']}},latenite__away:away}};
 class Client{
  handlers=new Map();onState(callback){this.stateCallback=callback;}
  on(topic,callback){const values=this.handlers.get(topic)||[];values.push(callback);this.handlers.set(topic,values);return()=>{};}
  emit(topic,value){for(const callback of this.handlers.get(topic)||[])callback(value);}
  settings(scope,id){return{read:async()=>structuredClone(scope==='preset'?shared:fixture.parameters[id])};}
  selectScene(){throw Error('A preview attempted to select the real output');}
  start(){this.emit('connection',true);}stop(){this.stopped=true;}
 }
 const oldFixture=globalThis.__presetTest,oldLocation=globalThis.location;
 globalThis.__presetTest=fixture;globalThis.location={origin:'http://127.0.0.1:5280',protocol:'http:'};
 fixture.make=()=>fixture.client=new Client();
 const sdk='export const createClient=()=>globalThis.__presetTest.make();export const getSceneContext=()=>globalThis.__presetTest.context;export const request=()=>Promise.resolve();';
 const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 const binding=url(stripTypeScriptTypes(await readFile(new URL('../source/src/obs-bindings.ts',import.meta.url),'utf8'),{mode:'transform'}));
 let source=await readFile(new URL('../source/src/host-client.ts',import.meta.url),'utf8');
 source=source.replace("const sdkUrl = '/sdk/streamui.js';",'const sdkUrl = '+JSON.stringify(url(sdk))+';').replace("from './obs-bindings.ts'","from "+JSON.stringify(binding));
 try{
  const {host}=await import(url(stripTypeScriptTypes(source,{mode:'transform'})));
  const state={apiVersion:2,scenes:[{id:'latenite__ultrawide',view:'21:9'},{id:'latenite__fullscreen',view:'16:9'},{id:'latenite__away',view:'away'}],scene:{activeId:'latenite__ultrawide',previousId:null,playback:null,revision:0},plugins:[],outputUrl:'http://127.0.0.1:5280',configUrl:'http://127.0.0.1:5281',startup:false,preview:true};
  host.start();fixture.client.stateCallback(state);await new Promise(setImmediate);
  assert.deepEqual(host.state.config.titles,normal.titles);
  state.scene={activeId:'latenite__fullscreen',previousId:'latenite__ultrawide',playback:{id:'preview-one',startedAt:Date.now(),animate:true},revision:1};
  fixture.client.stateCallback(state);assert.equal(host.state.config.layoutMode,'16:9');assert.equal(host.state.config.titles.english[0],'Fullscreen');
  state.scene={activeId:'latenite__away',previousId:'latenite__fullscreen',playback:null,revision:2};fixture.client.stateCallback(state);
  assert.equal(host.state.config.away.enabled,true);assert.equal(host.state.config.away.text1,away.text1);assert.equal(host.state.config.layoutMode,'16:9');
  fixture.parameters.latenite__fullscreen.titles={english:['Edited'],chinese:['修改']};
  fixture.client.emit('scene.settingsChanged',{id:'latenite__fullscreen'});await new Promise(setImmediate);
  assert.equal(host.state.config.titles.english[0],'Edited');
  const messages=[];host.addEventListener('chat',event=>messages.push(event.detail));
  fixture.client.emit('plugin.laplace.chat.message',{id:'one',kind:'message',platform:'bilibili',timestamp:1700000000000,user:{id:'42',name:'观众',level:12,medalName:null,medalLevel:null},text:'Hello',gift:null,payment:null});
  assert.equal(messages[0].username,'观众');assert.equal(messages[0].message,'Hello');
  fixture.client.emit('plugin.obs-scenes.scene-changed',{id:'obs',name:'Camera',startedAt:Date.now()});assert.equal(host.state.config.away.enabled,true);
  host.stop();assert.ok(fixture.client.stopped);
 }finally{globalThis.__presetTest=oldFixture;globalThis.location=oldLocation;}
});
