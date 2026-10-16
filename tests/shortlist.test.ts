import {expect,it} from 'vitest';
import {createShortlistStore} from '../src/shortlist';
it('serializes concurrent saves and preserves notes when bookmarking again',async()=>{
 let rows:any[]=[];const store=createShortlistStore(async()=>structuredClone(rows),async next=>{await new Promise(r=>setTimeout(r,1));rows=next;});
 const a={repo:'a/r',url:'https://github.com/a/r',title:'a',note:'keep me'},b={repo:'b/r',url:'https://github.com/b/r',title:'b',note:''};
 await Promise.all([store.save(a,true),store.save(b,false)]);expect(rows).toHaveLength(2);
 await store.save({...a,note:''},false);expect(rows.find(i=>i.url===a.url).note).toBe('keep me');
 await Promise.all([store.remove(b.url),store.save({...a,note:'new'},true)]);expect(rows).toHaveLength(1);expect(rows[0].note).toBe('new');
});
