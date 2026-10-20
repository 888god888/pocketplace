import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

globalThis.document={baseURI:'https://888god888.github.io/pocketplace/'};
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),values}};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
const source=await readFile(new URL('../src/lib/remote.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source.replace("'./organize'",JSON.stringify(new URL('../src/lib/organize.ts',import.meta.url).href)),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateConnection,saveConnection,getConnection,clearConnection,testConnection,analyzeInput,isInstagramPost}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const settings={url:'https://example-project.supabase.co/functions/v1/ig-collect',token:'test-only-token-at-least-24-characters'};

test('連線密碼僅放在分頁工作階段；拒絕不受信任的服務網址',()=>{
 assert.deepEqual(getConnection(),{url:'',token:''});saveConnection(settings);assert.deepEqual(getConnection(),settings);
 assert.equal([...localStorage.values.values()].includes(settings.token),false);
 assert.equal([...sessionStorage.values.values()].includes(settings.token),true);
 for(const url of ['http://example-project.supabase.co/functions/v1/ig-collect','https://evil.example/functions/v1/ig-collect','https://example-project.supabase.co.evil.example/functions/v1/ig-collect','https://example-project.supabase.co/functions/v1/ig-collect?token=secret','https://user:password@example-project.supabase.co/functions/v1/ig-collect'])assert.throws(()=>validateConnection({...settings,url}));
 assert.throws(()=>validateConnection({...settings,token:'short'}));clearConnection();assert.deepEqual(getConnection(),{url:'',token:''});
});

test('網站以私密標頭呼叫已部署函式，保留多店資料與原始筆記',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json(options.method==='GET'?{ok:true,version:3,mode:'public-caption-rules'}:{caption:'店家合集介紹',places:[{title:'兄弟麵館',category:'美食',city:'台北',address:''},{title:'ED’s Diner',category:'美食',city:'台北市',address:'臺北市中山區樂群二路216號'}]})};
 try{
  await testConnection(settings);const result=await analyzeInput({url:'https://www.instagram.com/reel/DeWRsvKzGFD/?igsh=test',content:'我自己的筆記'},settings);
  assert.equal(result.places.length,2);assert.equal(result.places[1].city,'台北');assert.equal(result.places[0].address,'');assert.match(result.content,/我自己的筆記/);
  assert.equal(calls[1].options.headers['x-pocket-token'],settings.token);assert.equal(calls[1].options.credentials,'omit');assert.equal(calls[1].options.redirect,'error');
  assert.equal(JSON.stringify(calls[1].options.body).includes(settings.token),false);
  assert.equal(calls[1].url.includes(settings.token),false);
  const repeated=await analyzeInput({url:'https://www.instagram.com/reel/DeWRsvKzGFD/',content:result.content},settings);assert.equal(repeated.content,result.content);
  assert.equal(isInstagramPost('https://www.instagram.com/account/reel/DeWRsvKzGFD/'),true);
  assert.equal(isInstagramPost('https://www.instagram.com.evil.example/reel/DeWRsvKzGFD/'),false);
 }finally{globalThis.fetch=original}
});

test('未設定、驗證失敗與 IG 讀不到時不會回報成功',async()=>{
 const original=globalThis.fetch;
 try{
  await assert.rejects(analyzeInput({url:'https://www.instagram.com/reel/DeWRsvKzGFD/',content:''},{url:'',token:''}),/IG 連線設定/);
  globalThis.fetch=async()=>Response.json({error:'密碼不正確'},{status:401});await assert.rejects(testConnection(settings),/驗證失敗/);
  globalThis.fetch=async()=>Response.json({error:'沒有讀到貼文介紹'},{status:422});await assert.rejects(analyzeInput({url:'https://www.instagram.com/reel/DeWRsvKzGFD/',content:''},settings),/沒有讀到/);
  globalThis.fetch=async()=>{throw Error('Should not fetch non-IG URLs')};const local=await analyzeInput({url:'https://facebook.com/example',content:'店名：小巷咖啡'},settings);assert.equal(local.fields.title,'小巷咖啡');
 }finally{globalThis.fetch=original}
});
