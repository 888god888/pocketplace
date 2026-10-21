import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';

globalThis.document={baseURI:'https://example.github.io/pocketplace/'};
const source=(await readFile(new URL('../src/lib/ocr.ts',import.meta.url),'utf8')).replaceAll('import.meta.env.BASE_URL',JSON.stringify('./'));
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {recognize}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const image=new File(['fixture'],'screenshot.png',{type:'image/png'});

test('圖片辨識提供載入進度並在完成後釋放 worker',async()=>{
 let terminated=0;const messages=[];
 globalThis.window={Tesseract:{createWorker:async(_langs,_mode,options)=>{
  options.logger({status:'loading language traineddata'});
  return {recognize:async()=>({data:{text:'店名：截圖咖啡'}}),terminate:async()=>{terminated++}};
 }}};
 assert.equal(await recognize([image],message=>messages.push(message)),'店名：截圖咖啡');
 assert.equal(terminated,1);assert.ok(messages.some(message=>message.includes('繁體中文')));
});

test('停止辨識會立即解除等待並釋放執行中的 worker',async()=>{
 let started;const ready=new Promise(resolve=>{started=resolve});let terminated=0,rejectRead;
 globalThis.window={Tesseract:{createWorker:async()=>({
  recognize:()=>{started();return new Promise((_,reject)=>{rejectRead=reject})},
  terminate:async()=>{terminated++;rejectRead?.(Error('worker terminated'))},
 })}};
 const controller=new AbortController();const pending=recognize([image],()=>{},controller.signal);
 await ready;controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(terminated,1);
});

test('載入中停止後，延遲建立的 worker 也會被清除',async()=>{
 let finishLoading,finishCleanup;
 const created=new Promise(resolve=>{finishLoading=resolve}),cleaned=new Promise(resolve=>{finishCleanup=resolve});
 globalThis.window={Tesseract:{createWorker:()=>created}};
 const controller=new AbortController();const pending=recognize([image],()=>{},controller.signal);
 controller.abort();await assert.rejects(pending,{name:'AbortError'});
 finishLoading({recognize:()=>{throw Error('must not recognize after cancellation')},terminate:async()=>finishCleanup()});
 await cleaned;
});
