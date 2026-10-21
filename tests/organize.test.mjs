import test from 'node:test';
import assert from 'node:assert/strict';
import {extract,extractPlaces,canonical,safeUrl,cleanItem,resolveCollectionTitle} from '../src/lib/organize.ts';
test('繁體中文欄位擷取保留換行與欄位界線',()=>{const x=extract('店名：小巷咖啡\n地址：桃園市桃園區民有十街181號\n均消：250元\n推薦布丁');assert.equal(x.title,'小巷咖啡');assert.equal(x.address,'桃園市桃園區民有十街181號');assert.equal(x.city,'桃園市');assert.equal(x.price,'均消：250元');assert.equal(x.category,'咖啡甜點');assert(x.tags.includes('布丁'))});
test('沒有提供的店名、價格與地址保持空白',()=>{const x=extract('這裡風景真漂亮');assert.equal(x.title,'');assert.equal(x.address,'');assert.equal(x.price,'')});
test('拒絕可執行網址和含帳密網址',()=>{assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('https://user:pass@example.com'),'')});
test('追蹤參數不影響重複連結比對',()=>{assert.equal(canonical('https://www.instagram.com/reel/ABC/?igsh=123&utm_source=a'),'https://www.instagram.com/reel/ABC')});
test('匯入資料清理連結與重複標籤',()=>{const x=cleanItem({sources:['javascript:alert(1)','https://example.com'],category:'fake',tags:['咖啡','咖啡']});assert.deepEqual(x.sources,['https://example.com/']);assert.equal(x.category,'其他');assert.deepEqual(x.tags,['咖啡'])});
test('分析出的店名取代預設名稱，保留自訂店名且不清空既有標題',()=>{
 for(const title of ['','待確認店名的收藏','待整理的靈感','未命名收藏',' 待確認店名的收藏 '])assert.equal(resolveCollectionTitle(title,'ED’s Diner'),'ED’s Diner');
 assert.equal(resolveCollectionTitle('我想去的 ED 分店','ED’s Diner'),'我想去的 ED 分店');
 assert.equal(resolveCollectionTitle('待確認店名的收藏',''),'待確認店名的收藏');
 assert.equal(resolveCollectionTitle('小巷咖啡',undefined),'小巷咖啡');
 assert.equal(resolveCollectionTitle('','未命名收藏'),'');
});
test('截圖文字能辨識單店與多店，地址不會錯配到其他店',()=>{
 const single=extractPlaces('小巷咖啡\n地址：桃園市桃園區民有十街181號\n均消：250元\n推薦布丁');
 assert.equal(single.length,1);assert.equal(single[0].title,'小巷咖啡');assert.equal(single[0].address,'桃園市桃園區民有十街181號');assert.equal(single[0].price,'均消：250元');
 const multiple=extractPlaces('店名：小巷咖啡\n地址：桃園市桃園區民有十街181號\n\n店名：河岸食堂\n地址：台北市中山區測試路1號');
 assert.equal(multiple.length,2);assert.equal(multiple[0].city,'桃園');assert.equal(multiple[1].city,'台北');assert.equal(multiple[1].address,'台北市中山區測試路1號');
 const roundup=extractPlaces('🍽️兄弟麵館、ED’s Diner、永昌蕃茄牛肉麵、北安專業涼麵、大直肉圓、大直讚雞肉飯\n\n📍ED’s Diner\n臺北市中山區樂群二路216號');
 assert.equal(roundup.length,6);assert.ok(roundup.filter(p=>p.title!=='ED’s Diner').every(p=>!p.address));
 assert.equal(roundup.find(p=>p.title==='ED’s Diner').address,'臺北市中山區樂群二路216號');
 assert.deepEqual(extractPlaces('這裡風景真漂亮\n下次想來玩'),[]);
});
