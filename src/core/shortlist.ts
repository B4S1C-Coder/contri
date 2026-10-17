import {normalizeSaved,type Saved} from './brief';
export function createShortlistStore(read:()=>Promise<Saved[]>,write:(rows:Saved[])=>Promise<void>){
 let tail:Promise<unknown>=Promise.resolve();
 const mutate=(change:(rows:Saved[])=>Saved[])=>{const result=tail.then(async()=>{const next=change(await read());await write(next);return next;});tail=result.catch(()=>{});return result;};
 return {
 save:(raw:Saved,updateNote=false)=>mutate(rows=>{const item=normalizeSaved(raw),existing=rows.find(i=>i.url===item.url);if(rows.length>=50&&!existing)throw new Error('Shortlist is full. Remove an item first.');if(existing&&!updateNote)item.note=existing.note;return [item,...rows.filter(i=>i.url!==item.url)];}),
 remove:(url:string)=>mutate(rows=>rows.filter(i=>i.url!==url)),
 };
}
