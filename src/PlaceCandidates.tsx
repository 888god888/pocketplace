import {categories} from './lib/organize';
import MapActions,{MapLinkField} from './MapActions';
import type {Candidate} from './lib/remote';

export default function PlaceCandidates({items,onChange,disabled}:{items:Candidate[];onChange:(items:Candidate[])=>void;disabled:boolean}) {
  const update = (index:number,value:Partial<Candidate>) => onChange(items.map((item,i)=>i===index?{...item,...value}:item));
  return <section className="place-candidates" aria-label="辨識到的地點">
    <div className="candidate-heading"><strong>選擇要收藏的地點</strong><span>{items.filter(p=>p.selected).length} / {items.length} 家</span></div>
    <p className="microcopy">每家店各存一張卡片，共用這則貼文來源。沒有提供的地址與價格會留白。</p>
    <div className="candidate-actions"><button type="button" disabled={disabled} onClick={()=>onChange(items.map(p=>({...p,selected:true})))}>全選</button><button type="button" disabled={disabled} onClick={()=>onChange(items.map(p=>({...p,selected:false})))}>取消全選</button></div>
    {items.map((p,i)=><article className={'candidate-card '+(p.selected?'selected':'')} key={i}>
      <label className="candidate-select"><input type="checkbox" checked={p.selected} disabled={disabled} onChange={e=>update(i,{selected:e.target.checked})}/><strong>{p.title||`地點 ${i+1}`}</strong><span>{p.city||'地區待確認'}</span></label>
      {p.selected&&<><p className="candidate-summary">{p.category} · {p.address||'貼文未提供地址'}</p><div className="candidate-map-tools"><MapActions place={p} disabled={disabled}/></div><details><summary>查看／修改資訊</summary><div className="candidate-fields">
        <label className="field-label" htmlFor={'candidate-title-'+i}>店名／地點名稱</label><input id={'candidate-title-'+i} value={p.title} disabled={disabled} maxLength={120} onChange={e=>update(i,{title:e.target.value})}/>
        <div className="form-grid"><div><label className="field-label" htmlFor={'candidate-category-'+i}>分類</label><select id={'candidate-category-'+i} value={p.category} disabled={disabled} onChange={e=>update(i,{category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="field-label" htmlFor={'candidate-city-'+i}>地區</label><input id={'candidate-city-'+i} value={p.city} disabled={disabled} onChange={e=>update(i,{city:e.target.value})}/></div></div>
        <label className="field-label" htmlFor={'candidate-address-'+i}>地址</label><input id={'candidate-address-'+i} value={p.address} disabled={disabled} placeholder="貼文未提供可留白" onChange={e=>update(i,{address:e.target.value})}/>
        <MapLinkField id={'candidate-maps-'+i} value={p.mapsUrl||''} disabled={disabled} onChange={mapsUrl=>update(i,{mapsUrl})}/>
        <label className="field-label" htmlFor={'candidate-price-'+i}>價格／均消</label><input id={'candidate-price-'+i} value={p.price} disabled={disabled} placeholder="貼文未提供可留白" onChange={e=>update(i,{price:e.target.value})}/>
        <label className="field-label" htmlFor={'candidate-tags-'+i}>標籤</label><input id={'candidate-tags-'+i} value={p.tags.join('、')} disabled={disabled} onChange={e=>update(i,{tags:e.target.value.split(/[、,，]/)})}/>
        <label className="field-label" htmlFor={'candidate-notes-'+i}>筆記</label><textarea id={'candidate-notes-'+i} rows={3} value={p.notes} disabled={disabled} onChange={e=>update(i,{notes:e.target.value})}/>
        <label className="candidate-reviewed"><input type="checkbox" checked={p.reviewed} disabled={disabled} onChange={e=>update(i,{reviewed:e.target.checked})}/>我已確認這家店的資訊</label>
      </div></details></>}
    </article>)}
  </section>;
}
