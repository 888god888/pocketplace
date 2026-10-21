export type Attachment={id:string;name:string;type:string;size:number};
export type Collection={id:string;title:string;category:string;city:string;address:string;price:string;tags:string[];notes:string;content:string;sources:string[];files:Attachment[];visited:boolean;favorite:boolean;reviewed:boolean;createdAt:number;updatedAt:number;groupId?:string;mapsUrl?:string};
export const categories=['美食','咖啡甜點','景點','住宿','其他'];
const placeholderTitles=new Set(['','待確認店名的收藏','待整理的靈感','未命名收藏']);
export function isPlaceholderTitle(value:string|undefined){return placeholderTitles.has((value||'').trim())}
export function resolveCollectionTitle(current:string|undefined,detected:string|undefined) {
 const title=(current||'').trim(),recognized=(detected||'').trim();
 return placeholderTitles.has(title)&&!placeholderTitles.has(recognized)?recognized:title;
}
export function safeUrl(raw:string){try{const u=new URL(raw.trim());if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return '';return u.href}catch{return ''}}
export function safeMapsUrl(raw:unknown) {
  if(typeof raw!=='string'||raw.trim().length>4096)return '';
  try {
    const url=new URL(raw.trim());
    if(url.protocol!=='https:'||url.username||url.password||url.port)return '';
    const host=url.hostname;
    const regular=['google.com','www.google.com','google.com.tw','www.google.com.tw'].includes(host)&&/^\/maps(?:\/|$)/.test(url.pathname);
    const mapsHost=['maps.google.com','maps.google.com.tw'].includes(host);
    const share=host==='maps.app.goo.gl'&&/^\/[^/]+\/?$/.test(url.pathname);
    const legacy=host==='goo.gl'&&/^\/maps\/[^/]+\/?$/.test(url.pathname);
    const knowledge=host==='g.co'&&/^\/kgs\/[^/]+\/?$/.test(url.pathname);
    return regular||mapsHost||share||legacy||knowledge?url.href:'';
  } catch { return ''; }
}

export function canonical(raw:string){try{const u=new URL(raw);for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid|igsh|igshid|mibextid)/i.test(key))u.searchParams.delete(key);u.hash='';return u.href.replace(/\/$/,'')}catch{return raw}}
export function sameSourceCollection(a:{sources:string[];title:string;groupId?:string},b:{sources:string[];title:string;groupId?:string}) {
 const sharedSource=a.sources.some(s=>b.sources.some(t=>canonical(s)===canonical(t)));
 if(!sharedSource&&!(a.groupId&&a.groupId===b.groupId))return false;
 if(!a.groupId||!b.groupId)return true;
 const title=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s/g,'');
 return title(a.title)===title(b.title);
}
export function sourceName(url:string){if(safeMapsUrl(url))return 'Google 地圖';try{const h=new URL(url).hostname;if(/(^|\.)instagram\.com$/.test(h))return 'Instagram';if(/(^|\.)(facebook\.com|fb\.watch)$/.test(h))return 'Facebook';if(/(^|\.)(youtube\.com|youtu\.be)$/.test(h))return 'YouTube';return '網頁'}catch{return '文字／檔案'}}
export function extract(text:string){
 const t=text.replace(/\r/g,'');const compact=t.replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g,'$1');
 const tags=['拉麵','燒肉','火鍋','咖啡','甜點','布丁','早午餐','牛肉麵','小吃','居酒屋','吃到飽','親子','夜景','步道','海景','展覽','寵物友善','素食'].filter(x=>compact.includes(x));
 const category=/咖啡|甜點|布丁|蛋糕|甜甜圈/.test(compact)?'咖啡甜點':/飯店|旅館|民宿|住宿/.test(compact)?'住宿':/景點|步道|瀑布|公園|夜景|展覽|海邊|登山/.test(compact)?'景點':/美食|餐廳|拉麵|燒肉|火鍋|小吃|早餐|午餐|晚餐|牛肉麵|料理/.test(compact)?'美食':'其他';
 const addr=compact.match(/(?:地址|地點|店址)\s*[:：]?\s*([^\n]{5,85})/)?.[1]?.trim()||compact.match(/(?:臺|台)北市[^\n，。]{3,65}號|(?:桃園|新北|臺中|台中|臺南|台南|高雄|新竹|基隆|宜蘭|苗栗|彰化|南投|雲林|嘉義|屏東|花蓮|臺東|台東|澎湖|金門|連江)[市縣][^\n，。]{3,65}號/)?.[0]||'';
 const city=(addr+' '+compact).match(/(?:臺北|台北|新北|桃園|臺中|台中|臺南|台南|高雄|新竹|基隆|宜蘭|苗栗|彰化|南投|雲林|嘉義|屏東|花蓮|臺東|台東|澎湖|金門|連江)(?:市|縣)?/)?.[0]?.replace('臺','台')||'';
 const price=compact.match(/(?:人均|每人|均消|價位|價格|低消)\s*[:：]?\s*(?:NT\$|\$)?\s*\d[\d,]*(?:\s*[-~～至]\s*\d[\d,]*)?\s*元?/i)?.[0]||'';
 const title=compact.match(/(?:店名|餐廳名稱|景點名稱|名稱)\s*[:：]\s*([^\n#]{2,50})/)?.[1]?.trim()||'';
 return {title,category,city,address:addr,price,tags};
}
export function extractPlaces(text:string){
 const compact=text.replace(/\r/g,'').replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g,'$1');
 const lines=compact.split('\n').map(s=>s.trim());
 const names:string[]=[];
 const norm=(s:string)=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/\s/g,'');
 const clean=(s:string)=>s.replace(/^\s*(?:\d+[.、)）]\s*)?[\s📍🍽️🍜🍖🏠🏡☕🍰\-]+/u,'').replace(/[「」『』]/g,'').trim();
 const valid=(s:string)=>s.length>=2&&s.length<=80&&!/https?:|#|地址|電話|營業時間|推薦|必吃|懶人包|[。!?！？]/.test(s)&&!extract(s).address;
 const add=(raw:string)=>{const name=clean(raw);if(valid(name)&&!names.some(n=>norm(n)===norm(name))&&names.length<20)names.push(name)};
 for(const line of lines){
  const label=line.match(/^(?:店名|店家|餐廳名稱|景點名稱|名稱)\s*[:：]\s*(.+)$/);
  if(label)add(label[1]);
  if(/^(?:🍽|🍜|🍖|🏠|🏡|☕|🍰)/u.test(line)){
   const parts=clean(line).split(/[、，,|｜]/).map(clean);
   if(parts.length>1&&parts.every(valid))parts.forEach(add);
  }
  const pin=line.match(/^📍\s*(.+)$/u);if(pin)add(pin[1]);
 }
 if(!names.length){
  for(const match of compact.matchAll(/[「『]([^」』]{2,60})[」』]/g))if(/麵|飯|餐|店|館|咖啡|甜點|食堂|Diner|公園|步道|旅館/i.test(match[1]))add(match[1]);
 }
 if(!names.length){
  const meaningful=lines.filter(Boolean);
  for(let i=0;i<Math.min(meaningful.length,12);i++){
   const line=clean(meaningful[i]);
   if(valid(line)&&/麵館|飯|餐廳|店|館|咖啡|甜點|食堂|Diner|Cafe|Café|公園|步道|旅館/i.test(line)&&meaningful.slice(i+1,i+5).some(s=>/^地址\s*[:：]/.test(s)||!!extract(s).address)){add(line);break}
  }
 }
 const groups=new Map(names.map(name=>[name,[] as string[]]));let owner='';
 for(const line of lines){
  const hits=names.filter(name=>norm(line).includes(norm(name)));
  if(hits.length===1){owner=hits[0];groups.get(owner)!.push(line)}
  else if(hits.length>1)owner='';
  else if(owner)groups.get(owner)!.push(line);
 }
 const cities=[...new Set((compact.match(/(?:臺北|台北|新北|桃園|臺中|台中|臺南|台南|高雄|新竹|基隆|宜蘭|苗栗|彰化|南投|雲林|嘉義|屏東|花蓮|臺東|台東|澎湖|金門|連江)(?:市|縣)?/g)||[]).map(s=>s.replace('臺','台').replace(/[市縣]$/,'')))];
 return names.map(title=>{
  const block=names.length===1?compact:(groups.get(title)||[]).join('\n');
  const fields=extract(block);
  const category=fields.category==='其他'&&/麵|飯|餐|肉|料理|小吃|Diner|食堂|燒|鍋/i.test(title+block)?'美食':fields.category;
  return {...fields,title,category,city:fields.city.replace('臺','台').replace(/[市縣]$/,'')||(cities.length===1?cities[0]:''),notes:block.split('\n').filter(s=>s&&!s.startsWith('#')&&!extract(s).address&&norm(clean(s))!==norm(title)).slice(0,5).join('\n').slice(0,700)};
 });
}
export function cleanItem(raw:any){return {...(typeof raw.groupId==='string'&&raw.groupId?{groupId:raw.groupId.slice(0,80)}:{}),mapsUrl:safeMapsUrl(raw.mapsUrl),title:String(raw.title||'未命名收藏').slice(0,120),category:categories.includes(raw.category)?raw.category:'其他',city:String(raw.city||'').slice(0,30),address:String(raw.address||'').slice(0,200),price:String(raw.price||'').slice(0,80),tags:Array.isArray(raw.tags)?[...new Set(raw.tags.map(String))].slice(0,20).map(x=>String(x).slice(0,30)):[],notes:String(raw.notes||'').slice(0,10000),content:String(raw.content||'').slice(0,60000),sources:Array.isArray(raw.sources)?[...new Set<string>(raw.sources.map(String).map(safeUrl).filter(Boolean))].slice(0,30):[],files:Array.isArray(raw.files)?raw.files.slice(0,8).filter((x:any)=>typeof x?.id==='string').map((x:any)=>({id:x.id,name:String(x.name).slice(0,150),type:String(x.type).slice(0,100),size:Number(x.size)||0})):[],visited:!!raw.visited,favorite:!!raw.favorite,reviewed:!!raw.reviewed};}
