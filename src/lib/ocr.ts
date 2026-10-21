let loading:Promise<unknown>|null=null;

async function engine(progress:(message:string)=>void){
 if(!(window as any).Tesseract){
  progress('首次載入圖片文字辨識元件…');
  if(!loading)loading=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=new URL(`${import.meta.env.BASE_URL}ocr/tesseract.min.js`,document.baseURI).href;
   script.onload=resolve;
   script.onerror=()=>{loading=null;reject(Error('辨識元件載入失敗，請重新連線再試'))};
   document.head.appendChild(script);
  });
  await loading;
 }
 const stages:Record<string,string>={
  'loading tesseract core':'正在載入辨識核心…',
  'initializing tesseract':'正在啟動文字辨識…',
  'loading language traineddata':'首次載入繁體中文／英文資料，完成後會快取…',
  'initializing api':'正在準備圖片辨識…',
 };
 return (window as any).Tesseract.createWorker(['chi_tra','eng'],1,{
  workerPath:new URL(`${import.meta.env.BASE_URL}ocr/worker.min.js`,document.baseURI).href,
  corePath:new URL(`${import.meta.env.BASE_URL}ocr/tesseract-core-lstm.wasm.js`,document.baseURI).href,
  langPath:new URL(`${import.meta.env.BASE_URL}ocr/lang`,document.baseURI).href,
  logger:(event:any)=>{
   if(event.status==='recognizing text')progress(`辨識文字 ${Math.round(event.progress*100)}%`);
   else if(stages[event.status])progress(stages[event.status]);
  },
 });
}

export async function recognize(files:File[],progress:(message:string)=>void,signal?:AbortSignal){
 if(signal?.aborted)throw new DOMException('已停止辨識','AbortError');
 let worker:any=null,stopped=false,rejectStop:(reason:Error)=>void=()=>{};
 const stopPromise=new Promise<never>((_,reject)=>{rejectStop=reject});
 const abort=()=>{stopped=true;rejectStop(new DOMException('已停止辨識','AbortError'))};
 signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>{stopped=true;rejectStop(Error('圖片辨識逾時，可先保存原始圖片，稍後重試。'))},120000+files.length*45000);
 const check=()=>{if(stopped||signal?.aborted)throw new DOMException('已停止辨識','AbortError')};
 const task=(async()=>{
  worker=await engine(message=>{if(!stopped)progress(message)});
  if(stopped||signal?.aborted){await worker.terminate();worker=null;check()}
  const texts:string[]=[];
  for(const file of files){
   check();
   if(file.type.startsWith('image/')){
    progress(`正在讀取 ${file.name}`);
    const result=await worker.recognize(file);check();texts.push(result.data.text);
   }else if(file.type.startsWith('video/')){
    const url=URL.createObjectURL(file),video=document.createElement('video');
    video.muted=true;video.playsInline=true;video.preload='auto';video.src=url;
    try{
     await new Promise<void>((resolve,reject)=>{
      const limit=setTimeout(()=>reject(Error('無法讀取影片，請改用 MP4 或提供截圖')),20000);
      video.onloadedmetadata=()=>{clearTimeout(limit);resolve()};
      video.onerror=()=>{clearTimeout(limit);reject(Error('瀏覽器無法解碼這部影片，請改用 MP4 或提供截圖'))};
     });
     check();if(!Number.isFinite(video.duration)||!video.videoWidth)throw Error('影片格式無法讀取');
     const canvas=document.createElement('canvas'),scale=Math.min(1,1440/video.videoWidth);
     canvas.width=video.videoWidth*scale;canvas.height=video.videoHeight*scale;
     const context=canvas.getContext('2d')!;
     for(const [i,fraction] of [0.05,0.3,0.6,0.9].entries()){
      check();progress(`影片畫面 ${i+1}/4`);
      await new Promise<void>((resolve,reject)=>{
       const limit=setTimeout(()=>reject(Error('影片畫面讀取逾時')),15000);
       video.onseeked=()=>{clearTimeout(limit);resolve()};
       video.currentTime=Math.min(video.duration*fraction,Math.max(0,video.duration-0.05));
      });
      check();context.drawImage(video,0,0,canvas.width,canvas.height);
      const result=await worker.recognize(canvas);texts.push(result.data.text);
     }
    }finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}
   }
  }
  return [...new Set(texts.map(text=>text.trim()).filter(Boolean))].join('\n\n');
 })();
 try{return await Promise.race([task,stopPromise])}
 finally{
  stopped=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
  if(worker){try{await worker.terminate()}catch{}worker=null}
 }
}
