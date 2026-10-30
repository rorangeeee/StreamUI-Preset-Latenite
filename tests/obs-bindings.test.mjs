import test from 'node:test';
import assert from 'node:assert/strict';
import { ObsSceneBindings } from '../source/src/obs-bindings.ts';
test('only scenes with an OBS name participate in automatic switching and animation', () => {
 const calls=[],binding=new ObsSceneBindings((id,options)=>calls.push({id,...options}),false);
 binding.configure([{id:'wide',name:''},{id:'full',name:'Camera'}],'Game','wide');
 binding.observe({id:'one',name:'Game',startedAt:1});assert.equal(calls.length,0);
 binding.observe({id:'two',name:'Camera',startedAt:2});assert.deepEqual(calls,[{id:'full',animate:true,cue:'two',startedAt:2}]);
 binding.observe({id:'three',name:'Unbound',startedAt:3});assert.equal(calls.length,1);
 binding.observe({id:'four',name:'Camera',startedAt:4});assert.equal(calls.length,2);
 binding.configure([{id:'wide',name:''},{id:'full',name:''}],'Camera','full');
 binding.observe({id:'five',name:'Game',startedAt:5});binding.observe({id:'six',name:'Camera',startedAt:6});assert.equal(calls.length,2);
});
test('preview components never act on OBS events, including initial synchronization', () => {
 const calls=[],binding=new ObsSceneBindings((...value)=>calls.push(value),true);
 binding.configure([{id:'wide',name:'Game'},{id:'full',name:'Camera'}],'Game','full');
 binding.observe({id:'one',name:'Camera',startedAt:1});binding.synchronize('Game','full');
 assert.deepEqual(calls,[]);
});
test('initial connection synchronizes a configured scene without playing an animation', () => {
 const calls=[],binding=new ObsSceneBindings((id,options)=>calls.push({id,...options}),false);
 binding.configure([{id:'full',name:'Camera'}],'Camera','wide');
 assert.equal(calls[0].id,'full');assert.equal(calls[0].animate,false);
});
