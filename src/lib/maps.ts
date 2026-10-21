import {safeMapsUrl,isPlaceholderTitle} from './organize';
export {safeMapsUrl};
export type MappablePlace = {title?:string;city?:string;address?:string;mapsUrl?:string};

export function mapsSearchQuery(place:MappablePlace) {
  const title=isPlaceholderTitle(place.title)?'':place.title?.trim();
  if(!title&&!place.address?.trim())return '';
  return [title,place.address?.trim()||place.city?.trim()].filter(Boolean).join(' ');
}

export function isMapsSearchUrl(raw:unknown) {
 const value=safeMapsUrl(raw);if(!value)return false;
 const url=new URL(value);return /^\/maps\/search\/?$/.test(url.pathname)&&!url.searchParams.has('query_place_id');
}

export function automaticMapsUrl(place:MappablePlace) {
 const saved=safeMapsUrl(place.mapsUrl);
 return saved&&!isMapsSearchUrl(saved)?saved:mapsSearchUrl(place)||saved;
}

export function mapsSearchUrl(place:MappablePlace) {
  let query=mapsSearchQuery(place);
  if(!query)return '';
  const prefix='https://www.google.com/maps/search/?api=1&query=';
  const chars=Array.from(query);
  while(prefix.length+encodeURIComponent(query).length>2048){chars.pop();query=chars.join('')}
  return prefix+encodeURIComponent(query);
}

export async function copyMapsText(text:string,clipboard?:{writeText:(text:string)=>Promise<void>}) {
  if(!text.trim())return false;
  try {
    const target=clipboard??globalThis.navigator?.clipboard;
    if(!target)return false;
    await target.writeText(text);
    return true;
  } catch { return false; }
}
