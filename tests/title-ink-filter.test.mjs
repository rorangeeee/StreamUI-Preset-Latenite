import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const source=await readFile(new URL('../source/src/title-ink-filter.ts',import.meta.url),'utf8');
const {filterSteps}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));

test('fractional ink growth survives interpolation at different canvas scales',()=>{
 for(const scale of [.25,.5,1,1.5,2]){
  for(const pixels of [0,.01,.1,.49,.5,.51,.99,1,1.01,1.49,1.5,3.99,4]){
   const value=pixels/scale;
   const step=filterSteps(value,scale);
   const reconstructed=step.lower*(1-step.mix)+step.upper*step.mix;
   assert.ok(Math.abs(reconstructed-value)<1e-10);
   assert.ok(Math.abs(step.lower*scale-Math.round(step.lower*scale))<1e-10);
   assert.ok(Math.abs(step.upper*scale-Math.round(step.upper*scale))<1e-10);
   assert.ok(step.mix>=0 && step.mix<1);
  }
 }
});

test('ink interpolation has no jump when crossing an integer device pixel',()=>{
 for(const scale of [.5,1,2]){
  const reconstruct=value=>{const s=filterSteps(value,scale);return s.lower*(1-s.mix)+s.upper*s.mix;};
  for(const boundary of [1,2,3,4]){
   const left=reconstruct((boundary-1e-6)/scale),right=reconstruct((boundary+1e-6)/scale);
   assert.ok(Math.abs(right-left-2e-6/scale)<1e-10);
  }
 }
});
