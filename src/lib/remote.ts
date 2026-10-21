import {categories, cleanItem, extract, extractPlaces, safeUrl} from './organize';

export type Connection = {url: string; token: string};
export type Place = {title:string; category:string; city:string; address:string; price:string; tags:string[]; notes:string; mapsUrl?:string};
export type Candidate = Place & {selected:boolean; reviewed:boolean};
const key = () => 'pocket-connection:' + new URL('.', document.baseURI).pathname;

export function getConnection():Connection {
  try { return {url:localStorage.getItem(key()+':url')||'',token:sessionStorage.getItem(key()+':token')||''}; }
  catch { return {url:'',token:''}; }
}

export function validateConnection(value:Connection):Connection {
  let url:URL;
  try { url = new URL(value.url.trim()); } catch { throw Error('請貼上 Supabase 的 Function URL。'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) ||
      url.username || url.password || url.port || url.search || url.hash ||
      !/^\/functions\/v1\/[a-z0-9_-]+\/?$/i.test(url.pathname)) {
    throw Error('請使用 https://專案代碼.supabase.co/functions/v1/函式名稱 格式的網址。');
  }
  if (value.token.trim().length < 24) throw Error('連線密碼至少需要 24 個字元。');
  return {url:url.href.replace(/\/$/,''),token:value.token.trim()};
}

export function saveConnection(value:Connection) {
  const settings = validateConnection(value);
  try { localStorage.setItem(key()+':url',settings.url); sessionStorage.setItem(key()+':token',settings.token); }
  catch { throw Error('瀏覽器目前無法保存連線設定，請確認儲存權限。'); }
  return settings;
}

export function clearConnection() {
  try { localStorage.removeItem(key()+':url'); sessionStorage.removeItem(key()+':token'); }
  catch { throw Error('瀏覽器目前無法清除連線設定。'); }
}

export function isInstagramPost(raw:string) {
  try { const url = new URL(raw); return url.protocol==='https:' && ['instagram.com','www.instagram.com'].includes(url.hostname) && /^\/(?:[^/]+\/)?(?:reel|p|tv)\/[A-Za-z0-9_-]{5,32}\/?$/.test(url.pathname); }
  catch { return false; }
}

async function callFunction(settings:Connection, body?:{url:string}) {
  const {url,token} = validateConnection(settings);
  let response:Response;
  try {
    response = await fetch(url, {
      method:body?'POST':'GET', mode:'cors', credentials:'omit', redirect:'error',
      headers:{'x-pocket-token':token,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined, signal:AbortSignal.timeout(60000),
    });
  } catch (e) {
    if (e instanceof Error && ['TimeoutError','AbortError'].includes(e.name)) throw Error('讀取逾時，請稍後重試。');
    throw Error('無法連線，請確認網路、Function URL，以及 ALLOWED_ORIGINS 是否包含目前網站網址。');
  }
  let data:any;
  try { data = await response.json(); } catch { throw Error('函式沒有回傳可讀取的結果，請確認 Function URL。'); }
  if (!response.ok) {
    if (response.status===401) throw Error('驗證失敗，請確認連線密碼與函式的 JWT 設定。');
    throw Error(typeof data?.error==='string'?data.error.slice(0,600):`讀取失敗（HTTP ${response.status}）。`);
  }
  return data;
}

export async function testConnection(settings:Connection) {
  const data = await callFunction(settings);
  if (data?.ok!==true || data?.mode!=='public-caption-rules') throw Error('這個網址沒有回傳預期的收藏服務，請確認 Function URL。');
  return data;
}

function placeFields(raw:unknown):Place {
  const p = cleanItem(raw && typeof raw==='object'?raw:{});
  const city = p.city.replace('臺','台').replace(/[市縣]$/,'');
  return {title:p.title==='未命名收藏'?'':p.title,category:categories.includes(p.category)?p.category:'其他',city,address:p.address,price:p.price,tags:p.tags,notes:p.notes};
}

export async function analyzeInput(input:{url:string;content:string}, settings:Connection) {
  const source = safeUrl(input.url);
  const local=(prefix='')=>{
    const places:Place[]=extractPlaces(input.content);
    return {fields:places[0]||extract(input.content),content:input.content,places,message:prefix+(places.length?`已整理出 ${places.length} 個地點並附上地圖搜尋，確認後即可收藏。`:'尚未可靠辨識到店名，可先保留原始內容，稍後再整理。')};
  };
  if (!isInstagramPost(source)) return local(source?'此來源先保留連結。':'');
  if (!settings.url || !settings.token) {
    if(input.content.trim())return local('尚未連接 IG，先使用提供的文字或截圖。');
    throw Error('請先按「IG 連線設定」，填入 Function URL 與連線密碼，再重試。');
  }
  let data:any;
  try{data=await callFunction(settings,{url:source})}
  catch(e){if(input.content.trim())return local('IG 介紹暫時無法讀取，先使用提供的文字或截圖。');throw e}
  if (typeof data?.caption!=='string' || data.caption.trim().length<4 || !Array.isArray(data.places)) throw Error('回傳結果不完整，尚未完成整理。');
  let places:Place[] = data.places.slice(0,20).map(placeFields).filter((p:Place)=>p.title.trim());
  if(!places.length)places=extractPlaces(data.caption);
  const caption=data.caption.trim(),pasted=input.content.trim();
  const content = (pasted===caption||pasted.startsWith(caption+'\n\n')?pasted:[caption,pasted].filter(Boolean).join('\n\n')).slice(0,60000);
  return {fields:places[0]||extract(data.caption),content,places,message:places.length?`已讀取 IG 介紹，辨識 ${places.length} 個地點並附上地圖搜尋。確認後即可收藏。`:'已讀到 IG 介紹，尚未辨識到店名，請補充確認。'};
}
