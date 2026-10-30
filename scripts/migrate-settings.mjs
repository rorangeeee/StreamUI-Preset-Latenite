import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
async function read(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return{};throw error;}}
async function save(file,value){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2)+'\n');}
function missing(target,source){for(const[key,value]of Object.entries(source)){if(!(key in target))target[key]=structuredClone(value);else if(value&&typeof value==='object'&&!Array.isArray(value)&&target[key]&&typeof target[key]==='object'&&!Array.isArray(target[key]))missing(target[key],value);}}
export async function migrate(directory){
 const root=path.resolve(directory),marker=path.join(root,'preset-migrations/latenite-v2.json');
 if((await read(marker)).version===2)return{migrated:false,scenes:[]};
 const current=await read(path.join(root,'core-settings.json')),backup=await read(path.join(root,'core-settings.v1.json'));
 const legacy=Object.keys(backup).length?backup:current;
 const shared=await read(path.join(root,'preset-settings/latenite.json')),scenes=[];
 for(const localId of ['ultrawide','fullscreen','away']){
  const id='latenite__'+localId,file=path.join(root,'scene-settings',id+'.json'),values=await read(file),imported={};
  const name=legacy.scenes?.find(scene=>scene.id===id)?.obsScene;
  if(name)imported.obsSceneName=name;
  if(localId==='away'&&shared.away)for(const key of ['text1','text2','overlayOpacity']){if(key in shared.away)imported[key]=shared.away[key];}
  if(localId!=='away'&&shared.titles)imported.titles=shared.titles;
  if(Object.keys(imported).length){missing(values,imported);await save(file,values);scenes.push(id);}
 }
 if(!current.formatVersion&&legacy.away?.enabled&&legacy.activePresetId==='latenite'){
  if(!Object.keys(backup).length)await copyFile(path.join(root,'core-settings.json'),path.join(root,'core-settings.v1.json'));
  await save(path.join(root,'core-settings.json'),{...current,selectedSceneId:'latenite__away'});
 }
 await save(marker,{version:2});return{migrated:true,scenes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 if(!process.argv[2])throw Error('Usage: npm run migrate -- <Core data directory>');
 console.log(JSON.stringify(await migrate(process.argv[2]),null,2));
}
