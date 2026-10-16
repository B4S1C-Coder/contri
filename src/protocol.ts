import type { ActivityReport, TeamReport, Repo, LinkCheck, IssueQuery, documents, searchIssues } from './evidence';
import type { Connection } from './auth';
import type { rankSearch } from './github';
import type {Saved} from './brief';
export type Operations = {
  saved: {input:Record<string,never>;output:Saved[]};
  save: {input:{item:Saved;updateNote?:boolean};output:Saved[]};
  removeSaved: {input:{url:string};output:Saved[]};
  repo: { input: {repo:string}; output: Repo };
  activity: { input: {repo:string}; output: ActivityReport };
  team: { input: {repo:string}; output: TeamReport };
  documents: { input: {repo:string}; output: Awaited<ReturnType<typeof documents>> };
  issues: { input: IssueQuery; output: Awaited<ReturnType<typeof searchIssues>> };
  links: { input: {repo:string;number:number}; output: LinkCheck };
  search: { input: {query:string}; output: Awaited<ReturnType<typeof rankSearch>> };
  connection: { input: Record<string,never>; output: Connection };
  settings: { input: Record<string,never>; output: boolean };
  refresh: { input: Record<string,never>; output: boolean };
  position: { input: {x?:number;y?:number}; output: {x?:number;y?:number} };
  connect: { input: {token:string;remember:boolean}; output: Connection };
  disconnect: { input: Record<string,never>; output: Connection };
};
export type Operation=keyof Operations;
export type Message<K extends Operation=Operation>={op:K;input:Operations[K]['input']};
export function call<K extends Operation>(op:K,input:Operations[K]['input'],signal?:AbortSignal):Promise<Operations[K]['output']> {
  if(typeof chrome==='undefined'||!chrome.runtime?.connect) return Promise.reject(new Error('Install the extension to read live GitHub data. This browser preview shows layout only.'));
  return new Promise((resolve,reject)=>{
    const port=chrome.runtime.connect({name:'compass'});
    let finished=false;
    const finish=(error?:Error,value?:unknown)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);port.disconnect();error?reject(error):resolve(value as Operations[K]['output']);};
    const abort=()=>finish(new DOMException('Cancelled','AbortError'));
    port.onMessage.addListener((response:{ok:boolean;value?:unknown;error?:string})=>finish(response.ok?undefined:new Error(response.error||'Request failed'),response.value));
    port.onDisconnect.addListener(()=>{const error=chrome.runtime.lastError;finish(new Error(error?.message||'Extension connection closed. Reload this GitHub tab.'));});
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted){abort();return;}
    port.postMessage({op,input});
  });
}
