import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
async function read(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return{};throw error;}}
async function readOptional(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function save(file,value){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2)+'\n');}
function missing(target,source){for(const[key,value]of Object.entries(source)){if(!(key in target))target[key]=structuredClone(value);else if(value&&typeof value==='object'&&!Array.isArray(value)&&target[key]&&typeof target[key]==='object'&&!Array.isArray(target[key]))missing(target[key],value);}}
export async function migrate(directory){
 const root=path.resolve(directory),marker=path.join(root,'preset-migrations/latenite-v2.json'),prior=await read(marker);
 if(prior.version>=4)return{migrated:false,scenes:[]};
 const currentFile=path.join(root,'core-settings.json'),current=await read(currentFile),backup=await read(path.join(root,'core-settings.v1.json'));
 const legacy=Object.keys(backup).length?backup:current,oldSharedFile=path.join(root,'preset-settings/latenite.json'),newSharedFile=path.join(root,'preset-settings/when.latenite.json');
 const oldShared=await read(oldSharedFile),newShared=await read(newSharedFile),scenes=[];
 if((prior.version??0)<2){
  for(const localId of ['ultrawide','fullscreen','away']){
   const oldId='latenite__'+localId,file=path.join(root,'scene-settings',oldId+'.json'),values=await read(file),imported={};
   const name=legacy.scenes?.find(scene=>scene.id===oldId)?.obsScene;
   if(localId!=='away'&&name)imported.obsSceneName=name;
   if(localId==='away'&&oldShared.away)for(const key of ['text1','text2','overlayOpacity']){if(key in oldShared.away)imported[key]=oldShared.away[key];}
   if(localId!=='away'&&oldShared.titles)imported.titles=oldShared.titles;
   if(Object.keys(imported).length){missing(values,imported);await save(file,values);scenes.push(oldId);}
  }
 }
 if((prior.version??0)<3){
  const selectedAway=current.activePresetId==='latenite'&&current.selectedSceneId==='latenite__away';
  const legacyEnabled=(prior.version??0)<2&&legacy.activePresetId==='latenite'&&legacy.away?.enabled;
  if(selectedAway||legacyEnabled){
   missing(oldShared,{controls:{away:true}});await save(oldSharedFile,oldShared);
   const saved=path.join(root,'preset-migrations/latenite-overlay-core-settings.json');
   if(!Object.keys(await read(saved)).length){await mkdir(path.dirname(saved),{recursive:true});await copyFile(currentFile,saved);}
   if(!current.formatVersion&&!Object.keys(backup).length)await copyFile(currentFile,path.join(root,'core-settings.v1.json'));
   const normal=legacy.selectedSceneId&&legacy.selectedSceneId!=='latenite__away'?legacy.selectedSceneId:'latenite__ultrawide';
   await save(currentFile,{...current,selectedSceneId:normal});
  }
 }
 if(Object.keys(oldShared).length){missing(newShared,oldShared);await save(newSharedFile,newShared);}
 for(const localId of ['ultrawide','fullscreen','away']){
  const oldScene=await readOptional(path.join(root,'scene-settings','latenite__'+localId+'.json'));
  const newSceneFile=path.join(root,'scene-settings','when.latenite__'+localId+'.json'),newScene=await read(newSceneFile);
  if(oldScene!==null){missing(newScene,oldScene);await save(newSceneFile,newScene);const id='when.latenite__'+localId;if(!scenes.includes(id))scenes.push(id);}
 }
 const latestCore=await read(currentFile);
 if(latestCore.activePresetId==='latenite'){
  const nextCore={...latestCore,activePresetId:'when.latenite'};
  if(typeof latestCore.selectedSceneId==='string'&&latestCore.selectedSceneId.startsWith('latenite__')){
   const local=latestCore.selectedSceneId.slice('latenite__'.length);
   nextCore.selectedSceneId=local==='away'?'when.latenite__ultrawide':'when.latenite__'+local;
  }
  await save(currentFile,nextCore);
 }
 await save(marker,{version:4});return{migrated:true,scenes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 if(!process.argv[2])throw Error('Usage: npm run migrate -- <Core data directory>');
 console.log(JSON.stringify(await migrate(process.argv[2]),null,2));
}
