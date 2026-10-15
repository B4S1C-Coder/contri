import { connect, connection, disconnect, initializeAuth } from './auth';
import { authenticatedFetch, capacity, resetTransport } from './transport';
import { clearMemory, rankSearch, setTransport } from './github';
import { publicRepo, overviewActivity, teamEvidence, documents, searchIssues, checkIssue, type IssueQuery } from './evidence';
import { validateMessage } from './validation';
import type { Message } from './protocol';
setTransport(authenticatedFetch as typeof fetch);
void initializeAuth();
const jobs=new Map<string,{promise:Promise<unknown>;controller:AbortController;users:Set<chrome.runtime.Port>}>();
let epoch=0;
async function invalidate() {
  epoch++; for(const job of jobs.values())job.controller.abort(); jobs.clear();clearMemory();resetTransport();
  const all=await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter(k=>k.startsWith('v3:')||k.startsWith('analysis:')));
}
async function perform(message:Message,signal:AbortSignal) {
  const p=message.input as Record<string,any>;
  switch(message.op){
    case 'repo':return publicRepo(p.repo,signal);
    case 'activity':return overviewActivity(p.repo,signal);
    case 'team':return teamEvidence(p.repo,signal);
    case 'documents':return documents(p.repo,signal);
    case 'issues':return searchIssues(p as IssueQuery,signal);
    case 'links':return checkIssue(p.repo,p.number,signal);
    case 'search':return rankSearch(p.query,signal);
    case 'connection':return {...await connection(),...capacity()};
    case 'settings':await chrome.runtime.openOptionsPage();return true;
    case 'refresh':await invalidate();return true;
    case 'connect':{const value=await connect(p.token,p.remember);await invalidate();return value;}
    case 'disconnect':{const value=await disconnect();await invalidate();return value;}
    case 'position':if(p.x!==undefined&&p.y!==undefined)await chrome.storage.local.set({widgetPosition:{x:p.x,y:p.y}});return (await chrome.storage.local.get('widgetPosition')).widgetPosition||{};
  }
}
chrome.runtime.onConnect.addListener(port=>{
  if(port.name!=='compass'||port.sender?.id!==chrome.runtime.id){port.disconnect();return;}
  const senderURL=port.sender?.url||'';
  const trusted=senderURL===chrome.runtime.getURL('settings.html');
  if(!trusted&&!/^https:\/\/github\.com\//.test(senderURL)){port.disconnect();return;}
  let key:string|undefined;let handled=false;
  port.onDisconnect.addListener(()=>{if(key){const job=jobs.get(key);job?.users.delete(port);if(job&&!job.users.size){job.controller.abort();jobs.delete(key);}}});
  port.onMessage.addListener(async raw=>{
    if(handled)return;handled=true;
    try{
      await initializeAuth();
      const message=validateMessage(raw,trusted);
      const cacheable=['repo','activity','team','documents','issues','links','search'].includes(message.op);
      if(!cacheable){port.postMessage({ok:true,value:await perform(message,new AbortController().signal)});return;}
      key=`v3:${JSON.stringify(message)}`;
      const cache=(await chrome.storage.local.get(key))[key];
      if(cache&&Date.now()-cache.at<15*60000){port.postMessage({ok:true,value:cache.value});return;}
      let job=jobs.get(key);
      if(!job){
        const controller=new AbortController();const currentEpoch=epoch;const cacheKey=key;
        const promise=perform(message,controller.signal).then(async value=>{
          if(currentEpoch!==epoch||controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
          // Never keep failed/partial sections fresh; users can retry immediately.
          const record=value as {warnings?:string[];state?:string;note?:string};
          if(!record.warnings?.length&&record.state!=='incomplete'&&!record.note){
            await chrome.storage.local.set({[cacheKey]:{at:Date.now(),value}});
            const all=await chrome.storage.local.get(null);const keys=Object.keys(all).filter(k=>k.startsWith('v3:')).sort((a,b)=>all[b].at-all[a].at);if(keys.length>100)await chrome.storage.local.remove(keys.slice(100));
          }
          return value;
        });
        job={promise,controller,users:new Set()};jobs.set(key,job);
        void promise.finally(()=>{if(jobs.get(cacheKey)?.promise===promise)jobs.delete(cacheKey);}).catch(()=>{});
      }
      job.users.add(port);const value=await job.promise;port.postMessage({ok:true,value});
    }catch(error){try{port.postMessage({ok:false,error:error instanceof Error?error.message:'Request unavailable'});}catch{/* caller closed */}}
  });
});
chrome.action.onClicked.addListener(async tab=>{
  if(tab.id&&tab.url?.startsWith('https://github.com/')){
    try{await chrome.tabs.sendMessage(tab.id,{type:'COMPASS_TOGGLE'});}catch{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['widget.js']});}
  }else await chrome.tabs.create({url:'https://github.com/explore'});
});
