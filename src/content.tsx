import { createRoot } from 'react-dom/client';
import { useEffect,useState } from 'react';
import { Compass } from '@phosphor-icons/react';
import { Widget } from './Widget';
import { parseRepo } from './metrics';
import { call } from './protocol';
import css from './widget.css?inline';
const ID='contributor-compass-widget-root';
const existing=document.getElementById(ID);
if(!existing){
 const host=document.createElement('div');host.id=ID;
 host.style.cssText='position:fixed!important;z-index:2147483646!important;right:18px;bottom:18px;width:360px;height:460px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);color-scheme:light;';
 document.documentElement.append(host);
 const shadow=host.attachShadow({mode:'open'});const style=document.createElement('style');style.textContent=css;shadow.append(style);const mount=document.createElement('div');mount.style.cssText='width:100%;height:100%;';shadow.append(mount);
 function currentRepo(){return location.hostname==='github.com'?parseRepo(location.href):null;}
 function Root(){
  const [repo,setRepo]=useState(currentRepo),[mode,setMode]=useState<'open'|'mini'|'closed'>(currentRepo()?'open':'mini');
  const clamp=()=>{const r=host.getBoundingClientRect();const x=Math.max(8,Math.min(r.left,innerWidth-r.width-8)),y=Math.max(8,Math.min(r.top,innerHeight-r.height-8));host.style.left=`${x}px`;host.style.top=`${y}px`;host.style.right='auto';host.style.bottom='auto';};
  const save=()=>{const r=host.getBoundingClientRect();void call('position',{x:r.left,y:r.top}).catch(()=>{});};
  const reset=()=>{host.style.left='auto';host.style.top='auto';host.style.right='18px';host.style.bottom='18px';clamp();save();};
  const move=(x:number,y:number)=>{const r=host.getBoundingClientRect();host.style.left=`${r.left+x}px`;host.style.top=`${r.top+y}px`;clamp();save();};
  const drag=(e:React.PointerEvent)=>{
   if(e.button!==0)return;e.preventDefault();const start=host.getBoundingClientRect(),x=e.clientX,y=e.clientY;
   const handle=(event:PointerEvent)=>{host.style.left=`${start.left+event.clientX-x}px`;host.style.top=`${start.top+event.clientY-y}px`;clamp();};
   const end=()=>{window.removeEventListener('pointermove',handle,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);save();};
   window.addEventListener('pointermove',handle,true);window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
  };
  useEffect(()=>{
   let previous=location.href;const update=()=>{if(location.href!==previous){previous=location.href;setRepo(currentRepo());}};
   const observer=new MutationObserver(update);observer.observe(document.documentElement,{childList:true,subtree:true});
   const interval=setInterval(update,1000);window.addEventListener('popstate',update);
   const toggle=(message:{type?:string})=>{if(message.type==='COMPASS_TOGGLE')setMode(old=>old==='open'?'mini':'open');};
   chrome.runtime.onMessage.addListener(toggle);
   void call('position',{}).then(p=>{if(p.x!==undefined&&p.y!==undefined){host.style.left=`${p.x}px`;host.style.top=`${p.y}px`;clamp();}}).catch(()=>{});
   window.addEventListener('resize',clamp);
   return()=>{observer.disconnect();clearInterval(interval);window.removeEventListener('popstate',update);window.removeEventListener('resize',clamp);chrome.runtime.onMessage.removeListener(toggle);};
  },[]);
  useEffect(()=>{host.style.display=mode==='closed'?'none':'block';host.style.width=mode==='mini'?'44px':'360px';host.style.height=mode==='mini'?'44px':'460px';if(mode!=='closed')clamp();},[mode]);
  return mode==='mini'?<button className="cc-launcher" aria-label="Open CONTRI" onClick={()=>setMode('open')}><Compass size={26} weight="duotone"/></button>:mode==='closed'?null:<Widget initialRepo={repo} onMinimize={()=>setMode('mini')} onClose={()=>setMode('closed')} onPositionReset={reset} onMove={move} onDrag={drag}/>;
 }
 createRoot(mount).render(<Root/>);
}
