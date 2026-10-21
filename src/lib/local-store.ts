import {sameSourceCollection,canonical,cleanItem,extract,safeUrl,type Collection} from './organize';
const DB_NAME='pocket-places-local-v1:'+new URL('.',document.baseURI).pathname;
let connection:Promise<IDBDatabase>|null=null;
const objectUrls=new Map<string,string>();
type StoredFile={id:string;name:string;type:string;size:number;blob:Blob};
function db(){if(!connection)connection=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const d=req.result;d.createObjectStore('items',{keyPath:'id'});d.createObjectStore('files',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>{connection=null;reject(Error('瀏覽器儲存空間無法使用，請確認不是無痕模式。'))}});return connection}
function result<T>(req:IDBRequest<T>){return new Promise<T>((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function finished(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('儲存失敗'))})}
async function readAll<T>(store:string){const d=await db();return result(d.transaction(store).objectStore(store).getAll()) as Promise<T[]>}
async function write(store:string,data:any){const d=await db();const tx=d.transaction(store,'readwrite');const done=finished(tx);tx.objectStore(store).put(data);await done}
export function attachmentUrl(id:string){return objectUrls.get(id)||''}
async function refreshUrls(){const files=await readAll<StoredFile>('files');for(const f of files)if(!objectUrls.has(f.id))objectUrls.set(f.id,URL.createObjectURL(f.blob))}
export async function api(path:string,options?:RequestInit):Promise<any>{try{const method=options?.method||'GET';if(path==='/api/files'&&method==='POST'){const f=(options!.body as FormData).get('file');if(!(f instanceof File)||f.size>25*1024*1024)throw Error('每個檔案上限 25 MB');const id=crypto.randomUUID();await write('files',{id,name:f.name,type:f.type,size:f.size,blob:f});objectUrls.set(id,URL.createObjectURL(f));return {id,name:f.name,type:f.type,size:f.size}}
 if(path==='/api/items/batch'&&method==='POST')return saveBatch(JSON.parse(String(options?.body||'{}')).items);
 if(path==='/api/analyze'){const raw=JSON.parse(String(options?.body||'{}'));return {fields:extract(String(raw.content||'')),content:String(raw.content||''),message:raw.url?'已整理提供的文字。GitHub Pages 無後端代理，連結只保留來源，請補貼文文字、截圖或影片檔協助辨識。':'已從提供的文字擷取資訊，請確認結果。'}}
 const items=await readAll<Collection>('items');if(method==='GET'){await refreshUrls();return items.sort((a,b)=>b.updatedAt-a.updatedAt)}
 if(method==='DELETE'){const id=new URL(path,'https://local.invalid').searchParams.get('id');const d=await db();const tx=d.transaction(['items','files'],'readwrite'),done=finished(tx);tx.objectStore('items').delete(id!);const item=items.find(x=>x.id===id);for(const f of item?.files||[]){if(!items.some(x=>x.id!==id&&x.files.some(a=>a.id===f.id))){tx.objectStore('files').delete(f.id);const u=objectUrls.get(f.id);if(u)URL.revokeObjectURL(u);objectUrls.delete(f.id)}}await done;return {ok:true}}
 const raw=JSON.parse(String(options?.body||'{}'));const old=items.find(x=>x.id===raw.id);if(method==='PATCH'&&!old)throw Error('找不到收藏');const data=cleanItem({...old,...raw});if(method==='POST'){const duplicate=items.find(x=>data.sources.some(s=>x.sources.some(a=>canonical(a)===canonical(String(s)))));if(duplicate){const e:any=Error('這個連結已經收藏過了');e.existingId=duplicate.id;throw e}}
 const item={...data,id:old?.id||crypto.randomUUID(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};await write('items',item);navigator.storage?.persist?.().catch(()=>{});return item;
 }catch(e:any){if(e?.name==='QuotaExceededError')throw Error('裝置儲存空間不足，請先匯出備份或清出空間。');throw e}}
async function toBase64(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('備份檔案讀取失敗'));reader.readAsDataURL(blob)})}
export async function exportBackup(){const items=await readAll<Collection>('items');const files=await readAll<StoredFile>('files');const assets=[];for(const f of files.filter(f=>items.some(i=>i.files.some(a=>a.id===f.id))))assets.push({id:f.id,name:f.name,type:f.type,size:f.size,base64:await toBase64(f.blob)});return new Blob([JSON.stringify({app:'pocket-places',version:2,exportedAt:new Date().toISOString(),items,assets})],{type:'application/json'})}
export async function importBackup(file:File){const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.items)||![1,2].includes(parsed.version))throw Error('不是支援的口袋收藏備份檔。');if(parsed.items.length>10000||!Array.isArray(parsed.assets||[]))throw Error('備份格式或筆數不正確。');const old=await readAll<Collection>('items');const remap=new Map<string,string>();const fs:StoredFile[]=[];for(const a of parsed.assets||[]){if(typeof a.id!=='string'||typeof a.base64!=='string'||! /^(image\/(jpeg|png|webp|gif|heic|heif)|video\/(mp4|quicktime|webm|x-m4v))$/.test(a.type))throw Error('備份附件格式不正確。');const binary=atob(a.base64);if(binary.length>25*1024*1024)throw Error('備份含有超過 25 MB 的附件。');const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);const id=crypto.randomUUID();remap.set(a.id,id);fs.push({id,name:String(a.name||'附件').slice(0,150),type:a.type,size:bytes.length,blob:new Blob([bytes],{type:a.type})})}
 const all=[...old],incoming:Collection[]=[];let skipped=0,missing=0;for(const raw of parsed.items){const data=cleanItem(raw);if(all.some(i=>sameSourceCollection(data,i))||old.some(i=>i.id===raw.id&&i.title===data.title&&i.content===data.content)){skipped++;continue}const files=data.files.flatMap((f:any)=>{const id=remap.get(f.id);if(!id){missing++;return []}return [{...f,id}]});const item={...data,files,id:crypto.randomUUID(),createdAt:Number(raw.createdAt)||Date.now(),updatedAt:Date.now()};incoming.push(item);all.push(item)}
 const d=await db();const tx=d.transaction(['items','files'],'readwrite'),done=finished(tx);for(const i of incoming)tx.objectStore('items').put(i);for(const f of fs)if(incoming.some(i=>i.files.some(a=>a.id===f.id)))tx.objectStore('files').put(f);await done;await refreshUrls();return {imported:incoming.length,skipped,missing}}

async function saveBatch(rawItems:unknown) {
 if(!Array.isArray(rawItems)||!rawItems.length||rawItems.length>20)throw Error('請選擇 1 至 20 家店收藏。');
 const groupId=crypto.randomUUID();
 const incoming=rawItems.map(raw=>{
  if(!raw||typeof raw!=='object'||typeof raw.title!=='string'||!raw.title.trim())throw Error('請為每家選取的店填寫名稱。');
  const data=cleanItem({...raw,title:raw.title.trim(),groupId});
  return {...data,id:crypto.randomUUID(),createdAt:Date.now(),updatedAt:Date.now()};
 });
 const d=await db();const tx=d.transaction('items','readwrite');const done=finished(tx);
 try {
  const all=await result(tx.objectStore('items').getAll()) as Collection[];
  for(const item of incoming){
   const duplicate=all.find(old=>sameSourceCollection(item,old));
   if(duplicate)throw Error(`「${item.title}」已收藏過這個來源；請取消勾選後再儲存。`);
   all.push(item);
  }
  for(const item of incoming)tx.objectStore('items').put(item);
  await done;navigator.storage?.persist?.().catch(()=>{});return incoming;
 } catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
}
