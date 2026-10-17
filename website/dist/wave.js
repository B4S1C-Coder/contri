import {waveY} from './wave-math.js';
const journey=document.querySelector('.journey');
const canvas=document.createElement('canvas');canvas.className='journey-canvas';canvas.setAttribute('aria-hidden','true');journey.prepend(canvas);
const ctx=canvas.getContext('2d');
if(ctx){
 journey.classList.add('wave-ready');
 const anchors=[...journey.querySelectorAll('.waypoint')];
 const positions=[.15,.5,.85],motion=matchMedia('(prefers-reduced-motion: reduce)');
 let width=0,height=0,time=0,previous=0,raf=0,visible=true;
 const stopped=()=>motion.matches||document.hidden||document.body.classList.contains('motion-paused')||!visible;
 function draw(){
  ctx.clearRect(0,0,width,height);ctx.beginPath();
  for(let px=0;px<=width;px+=2){const y=waveY(px/width,time)*height;if(px===0)ctx.moveTo(px,y);else ctx.lineTo(px,y);}
  ctx.strokeStyle='rgba(246,255,252,.94)';ctx.lineWidth=1.7;ctx.shadowColor='rgba(232,255,248,.55)';ctx.shadowBlur=7;ctx.stroke();ctx.shadowBlur=0;
  anchors.forEach((anchor,i)=>{anchor.style.left=`${positions[i]*width}px`;anchor.style.top=`${waveY(positions[i],time)*height}px`;});
 }
 function tick(now){raf=0;if(stopped()){previous=0;return;}if(previous)time+=Math.min((now-previous)/1000,.05);previous=now;draw();raf=requestAnimationFrame(tick);}
 function resume(){if(!stopped()&&!raf)raf=requestAnimationFrame(tick);else if(stopped()&&raf){cancelAnimationFrame(raf);raf=0;previous=0;}}
 function resize(){const r=journey.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();resume();}
 new ResizeObserver(resize).observe(journey);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();}).observe(journey);
 new MutationObserver(resume).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',resume);motion.addEventListener('change',()=>{draw();resume();});resize();
}
