import {expect,it} from 'vitest';
import {buildBrief,normalizeSaved} from '../src/brief';
it('creates a source-linked brief without inventing checked availability',()=>{
 const text=buildBrief({repo:'owner/project',title:'Fix docs',number:2,url:'https://github.com/owner/project/issues/2'},'plan');
 expect(text).toContain('Not checked');expect(text).toContain('https://github.com/owner/project/issues/2');expect(text).toContain('untrusted');expect(text).toContain('Do not invent');
});
it('rejects saved non-GitHub URLs and bounds notes',()=>{
 expect(()=>normalizeSaved({repo:'owner/project',url:'https://evil.com',title:'x',note:''})).toThrow();
 expect(normalizeSaved({repo:'owner/project',url:'https://github.com/owner/project/issues/1',title:'x',note:'x'.repeat(3000)}).note.length).toBe(2000);
});
