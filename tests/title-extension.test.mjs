import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const source=await readFile(new URL('../source/src/wordmark-motion.ts',import.meta.url),'utf8');
const {sampleTitleExtension,TITLE_TIMING,TITLE_STEP}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));

test('title ink growth switches at peak blur and releases all effects at rest',()=>{
 const hold=sampleTitleExtension(TITLE_TIMING.hold-1,2);
 assert.equal(hold.phase,'hold'); assert.equal(hold.blurX,0); assert.equal(hold.spacingScale,1);
 const peak=sampleTitleExtension(TITLE_TIMING.hold+TITLE_TIMING.transition/2,2);
 assert.equal(peak.phase,'shrink'); assert.equal(peak.blurX,64); assert.equal(peak.light,1);
 assert.equal(peak.spacingScale,.75); assert.equal(peak.glyphScaleX,1);
 const rest=sampleTitleExtension(TITLE_STEP,2);
 assert.equal(rest.from,1); assert.equal(rest.blurX,0); assert.equal(rest.light,0); assert.equal(rest.spacingScale,1);
});

test('title extension is symmetric across the language switch without stretching glyphs',()=>{
 for(const offset of [100,300,600,799]){
  const a=sampleTitleExtension(TITLE_TIMING.hold+offset,2);
  const b=sampleTitleExtension(TITLE_TIMING.hold+TITLE_TIMING.transition-offset,2);
  assert.ok(Math.abs(a.blurX-b.blurX)<1e-8);
  assert.ok(Math.abs(a.spacingScale-b.spacingScale)<1e-8);
  assert.equal(a.glyphScaleX,1); assert.equal(b.glyphScaleX,1);
 }
});
