import {useState} from 'react';
import {X,LoaderCircle,Link2} from 'lucide-react';
import {getConnection,saveConnection,clearConnection,testConnection,type Connection} from './lib/remote';

export default function ConnectionSettings({onClose,onSaved}:{onClose:()=>void;onSaved:(settings:Connection)=>void}) {
  const [settings,setSettings] = useState(getConnection);
  const [busy,setBusy] = useState(false),[error,setError] = useState('');
  async function save() {
    setBusy(true); setError('');
    try { await testConnection(settings); const saved = saveConnection(settings); onSaved(saved); onClose(); }
    catch (e) { setError(e instanceof Error?e.message:'連線失敗，請稍後重試。'); }
    finally { setBusy(false); }
  }
  function clear() { try { clearConnection(); setSettings({url:'',token:''}); onSaved({url:'',token:''}); } catch(e) { setError((e as Error).message); } }
  return <div className="modal-overlay connection-overlay" onClick={()=>!busy&&onClose()}><section className="help-modal connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose()}}}>
    <button className="close-help" aria-label="關閉連線設定" disabled={busy} onClick={onClose}><X/></button>
    <div className="eyebrow">CONNECT YOUR COLLECTION</div><h2 id="connection-title">IG 連線設定</h2>
    <p>連接你剛部署的 Supabase 函式，讀取公開貼文介紹。收藏仍儲存在這台裝置。</p>
    <label className="field-label" htmlFor="function-url">Function URL</label><input autoFocus id="function-url" type="url" value={settings.url} disabled={busy} onChange={e=>setSettings(s=>({...s,url:e.target.value}))} placeholder="https://專案代碼.supabase.co/functions/v1/ig-collect" autoComplete="off" spellCheck={false}/>
    <label className="field-label" htmlFor="function-token">連線密碼</label><input id="function-token" type="password" value={settings.token} disabled={busy} onChange={e=>setSettings(s=>({...s,token:e.target.value}))} placeholder="POCKET_ACCESS_TOKEN 的值" autoComplete="off"/>
    <p>密碼存於此分頁的工作階段，不會放進 GitHub 或收藏備份。此密碼只用來呼叫你的函式。</p>
    {error&&<div className="error" role="alert">{error}</div>}
    <div className="connection-actions"><button className="text-button" disabled={busy} onClick={clear}>清除連線設定</button><button className="primary" disabled={busy} onClick={save}>{busy?<LoaderCircle size={17} className="spin"/>:<Link2 size={17}/>} {busy?'正在測試…':'儲存並測試'}</button></div>
  </section></div>;
}
