import {useId,useState} from 'react';
import {MapPin,Copy,ArrowUpRight} from 'lucide-react';
import {copyMapsText,mapsSearchQuery,mapsSearchUrl,safeMapsUrl,isMapsSearchUrl,type MappablePlace} from './lib/maps';

export default function MapActions({place,disabled=false}:{place:MappablePlace;disabled?:boolean}) {
  const [feedback,setFeedback]=useState(''),[manual,setManual]=useState('');
  const id=useId();
  const search=mapsSearchUrl(place),saved=isMapsSearchUrl(place.mapsUrl)?'':safeMapsUrl(place.mapsUrl);
  const name=[place.title?.trim(),place.city?.trim()].filter(Boolean).join(' ');
  async function copy(text:string,label:string) {
    setManual('');
    if(await copyMapsText(text)){setFeedback(`已複製${label}`)}
    else{setManual(text);setFeedback('請在下方文字框全選複製；手機可長按文字。')}
  }
  return <div className="map-tools">
    <div className="map-actions">
      {search&&!disabled&&<a href={search} target="_blank" rel="noopener noreferrer" aria-label={`在 Google 地圖搜尋 ${place.title||place.address||place.city}`}><MapPin size={14}/>Google 地圖搜尋</a>}
      {saved&&!disabled&&<a href={saved} target="_blank" rel="noopener noreferrer" aria-label={`開啟 ${place.title||'店家'} 的已存地圖連結`}><ArrowUpRight size={14}/>已存地圖連結</a>}
      <button type="button" disabled={disabled||!name} onClick={()=>copy(name,'店名與地區')}><Copy size={14}/>複製店名＋地區</button>
      <button type="button" disabled={disabled||!place.address?.trim()} onClick={()=>copy(place.address!.trim(),'地址')} title={place.address?.trim()?'複製地址':'尚未提供地址'}><Copy size={14}/>複製地址</button>
    </div>
    {feedback&&<p className="map-feedback" role="status">{feedback}</p>}
    {manual&&<><label className="sr-only" htmlFor={id}>手動複製文字</label><textarea id={id} className="manual-copy" aria-describedby={id+'-hint'} readOnly value={manual} rows={2} onFocus={e=>e.currentTarget.select()}/><p id={id+'-hint'} className="microcopy">{mapsSearchQuery(place)?'複製後可貼到 Google 地圖搜尋。':''}</p></>}
  </div>;
}

export function MapLinkField({id,value,onChange,disabled=false}:{id:string;value:string;onChange:(value:string)=>void;disabled?:boolean}) {
  const [touched,setTouched]=useState(false);
  const invalid=touched&&!!value.trim()&&!safeMapsUrl(value);
  return <details className="map-link-field"><summary>指定地圖分店（選填）</summary>
    <label className="field-label" htmlFor={id}>Google 地圖分享連結 <span>選填</span></label>
    <input id={id} type="url" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} onBlur={()=>setTouched(true)} placeholder="貼上 Google 地圖 → 分享 → 複製連結" autoComplete="off" spellCheck={false} aria-invalid={invalid} aria-describedby={id+'-hint'}/>
    <p id={id+'-hint'} className={invalid?'map-field-error':'microcopy'}>{invalid?'請貼上完整的 Google 地圖 https 分享連結。':'已自動附上地圖搜尋，不必另填。想固定某個分店時，才需貼上該店分享連結。'}</p>
  </details>;
}
