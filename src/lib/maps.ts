import {safeMapsUrl} from './organize';
export {safeMapsUrl};
export type MappablePlace = {title?:string;city?:string;address?:string;mapsUrl?:string};

export function mapsSearchQuery(place:MappablePlace) {
  return [place.title?.trim(),place.address?.trim()||place.city?.trim()].filter(Boolean).join(' ');
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
