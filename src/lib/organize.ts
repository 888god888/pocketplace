export type Attachment={id:string;name:string;type:string;size:number};
export type Collection={id:string;title:string;category:string;city:string;address:string;price:string;tags:string[];notes:string;content:string;sources:string[];files:Attachment[];visited:boolean;favorite:boolean;reviewed:boolean;createdAt:number;updatedAt:number};
export const categories=['美食','咖啡甜點','景點','住宿','其他'];
export function safeUrl(raw:string){try{const u=new URL(raw.trim());if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return '';return u.href}catch{return ''}}
export function canonical(raw:string){try{const u=new URL(raw);for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid|igsh|igshid|mibextid)/i.test(key))u.searchParams.delete(key);u.hash='';return u.href.replace(/\/$/,'')}catch{return raw}}
export function sourceName(url:string){try{const h=new URL(url).hostname;if(/(^|\.)instagram\.com$/.test(h))return 'Instagram';if(/(^|\.)(facebook\.com|fb\.watch)$/.test(h))return 'Facebook';if(/(^|\.)(youtube\.com|youtu\.be)$/.test(h))return 'YouTube';return '網頁'}catch{return '文字／檔案'}}
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
export function cleanItem(raw:any){return {title:String(raw.title||'未命名收藏').slice(0,120),category:categories.includes(raw.category)?raw.category:'其他',city:String(raw.city||'').slice(0,30),address:String(raw.address||'').slice(0,200),price:String(raw.price||'').slice(0,80),tags:Array.isArray(raw.tags)?[...new Set(raw.tags.map(String))].slice(0,20).map(x=>String(x).slice(0,30)):[],notes:String(raw.notes||'').slice(0,10000),content:String(raw.content||'').slice(0,60000),sources:Array.isArray(raw.sources)?[...new Set<string>(raw.sources.map(String).map(safeUrl).filter(Boolean))].slice(0,30):[],files:Array.isArray(raw.files)?raw.files.slice(0,8).filter((x:any)=>typeof x?.id==='string').map((x:any)=>({id:x.id,name:String(x.name).slice(0,150),type:String(x.type).slice(0,100),size:Number(x.size)||0})):[],visited:!!raw.visited,favorite:!!raw.favorite,reviewed:!!raw.reviewed};}
