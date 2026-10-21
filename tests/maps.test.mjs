import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
import {safeMapsUrl,sourceName,cleanItem} from '../src/lib/organize.ts';

const source=await readFile(new URL('../src/lib/maps.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source.replace("'./organize'",JSON.stringify(new URL('../src/lib/organize.ts',import.meta.url).href)),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {mapsSearchQuery,mapsSearchUrl,copyMapsText}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('地圖搜尋包含店名與地址，沒有地址時使用地區，並正確編碼',()=>{
 const place={title:'ED’s Diner & 咖啡',city:'台北',address:'臺北市中山區樂群二路216號'};
 const url=new URL(mapsSearchUrl(place));
 assert.equal(url.origin,'https://www.google.com');assert.equal(url.pathname,'/maps/search/');assert.equal(url.searchParams.get('api'),'1');
 assert.equal(url.searchParams.get('query'),'ED’s Diner & 咖啡 臺北市中山區樂群二路216號');
 assert.equal(mapsSearchQuery({title:'兄弟麵館',city:'台北',address:''}),'兄弟麵館 台北');
 assert.equal(mapsSearchUrl({}), '');
 assert.ok(mapsSearchUrl({title:'🍜'.repeat(300),address:'中'.repeat(400)}).length<=2048);
});

test('接受 Google 地圖分享格式，拒絕可執行、假冒與其他網站連結',()=>{
 for(const url of ['https://maps.app.goo.gl/abc123?g_st=ic','https://www.google.com/maps/place/Example','https://www.google.com.tw/maps/search/?api=1&query=台北','https://maps.google.com/?q=咖啡','https://goo.gl/maps/abc123','https://g.co/kgs/abc123'])assert.ok(safeMapsUrl(url));
 for(const url of ['javascript:alert(1)','http://maps.app.goo.gl/abc123','https://maps.app.goo.gl.evil.example/abc123','https://www.google.com.evil.example/maps/place/Example','https://user:pass@www.google.com/maps/','https://example.com/maps/','https://www.google.com/search?q=咖啡'])assert.equal(safeMapsUrl(url),'');
 assert.equal(sourceName('https://maps.app.goo.gl/abc123'),'Google 地圖');
 assert.equal(cleanItem({mapsUrl:'javascript:alert(1)'}).mapsUrl,'');
});

test('複製送出指定文字，權限拒絕與空文字回傳手動複製狀態',async()=>{
 let copied='';
 assert.equal(await copyMapsText('兄弟麵館 台北',{writeText:async text=>{copied=text}}),true);assert.equal(copied,'兄弟麵館 台北');
 assert.equal(await copyMapsText('臺北市中山區樂群二路216號',{writeText:async()=>{throw Error('permission denied')}}),false);
 assert.equal(await copyMapsText('',{writeText:async()=>{throw Error('must not be called')}}),false);
});
