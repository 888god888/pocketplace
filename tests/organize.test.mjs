import test from 'node:test';
import assert from 'node:assert/strict';
import {extract,canonical,safeUrl,cleanItem} from '../src/lib/organize.ts';
test('繁體中文欄位擷取保留換行與欄位界線',()=>{const x=extract('店名：小巷咖啡\n地址：桃園市桃園區民有十街181號\n均消：250元\n推薦布丁');assert.equal(x.title,'小巷咖啡');assert.equal(x.address,'桃園市桃園區民有十街181號');assert.equal(x.city,'桃園市');assert.equal(x.price,'均消：250元');assert.equal(x.category,'咖啡甜點');assert(x.tags.includes('布丁'))});
test('沒有提供的店名、價格與地址保持空白',()=>{const x=extract('這裡風景真漂亮');assert.equal(x.title,'');assert.equal(x.address,'');assert.equal(x.price,'')});
test('拒絕可執行網址和含帳密網址',()=>{assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('https://user:pass@example.com'),'')});
test('追蹤參數不影響重複連結比對',()=>{assert.equal(canonical('https://www.instagram.com/reel/ABC/?igsh=123&utm_source=a'),'https://www.instagram.com/reel/ABC')});
test('匯入資料清理連結與重複標籤',()=>{const x=cleanItem({sources:['javascript:alert(1)','https://example.com'],category:'fake',tags:['咖啡','咖啡']});assert.deepEqual(x.sources,['https://example.com/']);assert.equal(x.category,'其他');assert.deepEqual(x.tags,['咖啡'])});
