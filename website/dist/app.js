const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav-links');
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));
const views={overview:`<h3>A living project.</h3><p>Read recent activity alongside its evidence. The numbers below are illustrative.</p><div class="demo-stats"><div><b>24</b><small>HUMAN MERGES</small></div><div><b>12</b><small>PR AUTHORS</small></div><div><b>90d</b><small>WINDOW</small></div></div><div class="demo-state"><span>Last observed team activity</span><span>2 days ago · demo</span></div>`,team:`<h3>People, not a score.</h3><p>Average and median first response, calculated from answered samples.</p><div class="demo-stats"><div><b>18h</b><small>AVERAGE · DEMO</small></div><div><b>8h</b><small>MEDIAN · DEMO</small></div><div><b>8/10</b><small>ANSWERED · DEMO</small></div></div><div class="demo-state"><span>Inspect the original replies</span><span>↗</span></div>`,issues:`<h3>Room to contribute.</h3><p>Check the discussion and linked work before you start. These are fictional examples.</p><div class="demo-state"><span>○ Improve the setup guide</span><span>help wanted</span></div><div class="demo-state"><span>No linked open PR found</span><span>✓</span></div><p>A completed reference check is useful context, not a guarantee that nobody is working.</p>`};
const content=document.getElementById('demo-content');content.innerHTML=views.overview;
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===button));content.innerHTML=views[button.dataset.view];document.querySelector('.demo-widget').hidden=false;document.getElementById('demo-restore').hidden=true;}));
document.getElementById('demo-minimize').addEventListener('click',()=>{document.querySelector('.demo-widget').hidden=true;document.getElementById('demo-restore').hidden=false;});
document.getElementById('demo-restore').addEventListener('click',()=>{document.querySelector('.demo-widget').hidden=false;document.getElementById('demo-restore').hidden=true;});
document.getElementById('show-install').addEventListener('click',()=>{const steps=document.getElementById('install-steps');steps.hidden=!steps.hidden;document.getElementById('show-install').setAttribute('aria-expanded',String(!steps.hidden));if(!steps.hidden)steps.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});

// Motion enhances the page; all information remains available without JavaScript.
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const revealNodes=document.querySelectorAll('.intro-heading,.feature-grid article,.demo-layout,.steps article,.manifesto .section,.faq,.final-cta .section');
if(!motion.matches&&'IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.12});
 revealNodes.forEach((node,index)=>{node.classList.add('reveal');node.style.setProperty('--reveal-delay',`${index%3*70}ms`);observer.observe(node);});
}
const card=document.querySelector('.hero-note');
const slides=[['YOUR TIME DESERVES A GOOD START','Behind every repository,<br>there’s a community.<br><em>Get to know it.</em>'],['READ THE EVIDENCE','Stars tell one story.<br>Human responses tell another.<br><em>See both.</em>'],['A MORE THOUGHTFUL FIRST STEP','Find an issue.<br>Check the work already underway.<br><em>Bring something useful.</em>']];
let slideIndex=0,paused=motion.matches;
const controls=document.createElement('div');controls.className='story-controls';controls.innerHTML='<button type="button" aria-label="Previous feature">←</button><span aria-live="off">1 / 3</span><button type="button" aria-label="Pause feature rotation">Pause</button><button type="button" aria-label="Next feature">→</button>';
card.after(controls);
const buttons=controls.querySelectorAll('button');
function showStory(index){slideIndex=(index+slides.length)%slides.length;card.querySelector('.eyebrow').textContent=slides[slideIndex][0];card.querySelector('div>p').innerHTML=slides[slideIndex][1];controls.querySelector('span').textContent=`${slideIndex+1} / 3`;if(!motion.matches)card.animate([{opacity:.65,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,easing:'ease-out'});}
function updatePause(){buttons[1].textContent=paused?'Play':'Pause';buttons[1].setAttribute('aria-label',paused?'Play feature rotation':'Pause feature rotation');}
buttons[0].addEventListener('click',()=>{paused=true;updatePause();showStory(slideIndex-1);});buttons[2].addEventListener('click',()=>{paused=true;updatePause();showStory(slideIndex+1);});buttons[1].addEventListener('click',()=>{paused=!paused;updatePause();});
let visible=false;new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(card);
setInterval(()=>{if(!paused&&visible&&!document.hidden&&!card.matches(':hover')&&!controls.contains(document.activeElement))showStory(slideIndex+1);},6500);
motion.addEventListener('change',()=>{if(motion.matches){paused=true;updatePause();document.querySelectorAll('.reveal').forEach(n=>n.classList.add('in-view'));}});updatePause();
card.addEventListener('pointermove',event=>{if(motion.matches||event.pointerType==='touch')return;const rect=card.getBoundingClientRect();card.style.setProperty('--light-x',`${event.clientX-rect.left}px`);card.style.setProperty('--light-y',`${event.clientY-rect.top}px`);});
document.querySelectorAll('[data-view]').forEach(button=>{button.setAttribute('aria-pressed',String(button.classList.contains('active')));button.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));if(!motion.matches)content.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'});});});

const hero=document.querySelector('.hero');
const motionToggle=document.createElement('button');motionToggle.className='motion-toggle';motionToggle.type='button';hero.append(motionToggle);
let motionPaused=motion.matches;
function setMotionPause(value){motionPaused=value;document.body.classList.toggle('motion-paused',value);motionToggle.textContent=value?'Play ambient motion':'Pause ambient motion';motionToggle.setAttribute('aria-pressed',String(value));if(value){paused=true;updatePause();}}
setMotionPause(motionPaused);
motionToggle.addEventListener('click',()=>setMotionPause(!motionPaused));
motion.addEventListener('change',()=>{if(motion.matches)setMotionPause(true);});
let pointerFrame=0;
hero.addEventListener('pointermove',event=>{if(motionPaused||motion.matches||event.pointerType==='touch'||pointerFrame)return;const x=event.clientX,y=event.clientY;pointerFrame=requestAnimationFrame(()=>{const r=hero.getBoundingClientRect();hero.style.setProperty('--water-x',`${(x-r.left)/r.width*100}%`);hero.style.setProperty('--water-y',`${(y-r.top)/r.height*100}%`);pointerFrame=0;});});
hero.addEventListener('pointerdown',event=>{if(motionPaused||motion.matches||event.target.closest('a,button,input,select,textarea'))return;const r=hero.getBoundingClientRect(),ring=document.createElement('span');ring.className='water-ripple';ring.setAttribute('aria-hidden','true');ring.style.left=`${event.clientX-r.left}px`;ring.style.top=`${event.clientY-r.top}px`;hero.append(ring);ring.addEventListener('animationend',()=>ring.remove(),{once:true});setTimeout(()=>ring.remove(),1500);});
const ambientObserver=new IntersectionObserver(entries=>{hero.classList.toggle('ambient-offscreen',!entries[0].isIntersecting);});ambientObserver.observe(hero);
document.addEventListener('visibilitychange',()=>hero.classList.toggle('ambient-hidden',document.hidden));
