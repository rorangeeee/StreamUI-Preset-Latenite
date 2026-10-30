import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
async function read(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return{};throw error;}}
async function save(file,value){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2)+'\n');}
function missing(target,source){for(const[key,value]of Object.entries(source)){if(!(key in target))target[key]=structuredClone(value);else if(value&&typeof value==='object'&&!Array.isArray(value)&&target[key]&&typeof target[key]==='object'&&!Array.isArray(target[key]))missing(target[key],value);}}
export async function migrate(directory){
 const root=path.resolve(directory),marker=path.join(root,'preset-migrations/latenite-v2.json'),prior=await read(marker);
 if(prior.version>=3)return{migrated:false,scenes:[]};
 const currentFile=path.join(root,'core-settings.json'),current=await read(currentFile),backup=await read(path.join(root,'core-settings.v1.json'));
 const legacy=Object.keys(backup).length?backup:current,sharedFile=path.join(root,'preset-settings/latenite.json'),shared=await read(sharedFile),scenes=[];
 if((prior.version??0)<2){
  for(const localId of ['ultrawide','fullscreen','away']){
   const id='latenite__'+localId,file=path.join(root,'scene-settings',id+'.json'),values=await read(file),imported={};
   const name=legacy.scenes?.find(scene=>scene.id===id)?.obsScene;
   if(localId!=='away'&&name)imported.obsSceneName=name;
   if(localId==='away'&&shared.away)for(const key of ['text1','text2','overlayOpacity']){if(key in shared.away)imported[key]=shared.away[key];}
   if(localId!=='away'&&shared.titles)imported.titles=shared.titles;
   if(Object.keys(imported).length){missing(values,imported);await save(file,values);scenes.push(id);}
  }
 }
 const selectedAway=current.activePresetId==='latenite'&&current.selectedSceneId==='latenite__away';
 const legacyEnabled=(prior.version??0)<2&&legacy.activePresetId==='latenite'&&legacy.away?.enabled;
 if(selectedAway||legacyEnabled){
  missing(shared,{controls:{away:true}});await save(sharedFile,shared);
  const saved=path.join(root,'preset-migrations/latenite-overlay-core-settings.json');
  if(!Object.keys(await read(saved)).length){await mkdir(path.dirname(saved),{recursive:true});await copyFile(currentFile,saved);}
  if(!current.formatVersion&&!Object.keys(backup).length)await copyFile(currentFile,path.join(root,'core-settings.v1.json'));
  const normal=legacy.selectedSceneId&&legacy.selectedSceneId!=='latenite__away'?legacy.selectedSceneId:'latenite__ultrawide';
  await save(currentFile,{...current,selectedSceneId:normal});
 }
 await save(marker,{version:3});return{migrated:true,scenes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 if(!process.argv[2])throw Error('Usage: npm run migrate -- <Core data directory>');
 console.log(JSON.stringify(await migrate(process.argv[2]),null,2));
}
