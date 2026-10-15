import { expect,it } from 'vitest';
import { validateMessage } from '../src/validation';
it('rejects credential operations from content scripts and malformed API inputs',()=>{
 expect(()=>validateMessage({op:'connect',input:{token:'test',remember:false}},false)).toThrow();
 expect(()=>validateMessage({op:'repo',input:{repo:'a/b/../../user'}},false)).toThrow();
 expect(()=>validateMessage({op:'links',input:{repo:'a/b',number:-1}},false)).toThrow();
 expect(validateMessage({op:'repo',input:{repo:'a/b'}},false).op).toBe('repo');
});
