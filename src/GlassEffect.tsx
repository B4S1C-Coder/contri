import { useEffect, useRef } from 'react';

/** Decorative pointer tracking; no React render loop and no pointer interception. */
export function GlassEffect() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = layer.current;
    const host = node?.parentElement;
    if (!node || !host) return;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;
    const position = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        const rect = host.getBoundingClientRect();
        node.style.setProperty('--pointer-x', `${clientX - rect.left}px`);
        node.style.setProperty('--pointer-y', `${clientY - rect.top}px`);
        node.dataset.active = 'true';
      });
    };
    const leave = () => { cancelAnimationFrame(frame); node.dataset.active = 'false'; };
    const down = (event: PointerEvent) => {
      position(event);
      node.dataset.pressed = 'true';
      clearTimeout(timer);
      timer = setTimeout(() => { node.dataset.pressed = 'false'; if (event.pointerType !== 'mouse') leave(); }, 650);
    };
    host.addEventListener('pointermove', position);
    host.addEventListener('pointerdown', down);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointercancel', leave);
    return () => {
      cancelAnimationFrame(frame); clearTimeout(timer);
      host.removeEventListener('pointermove', position); host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointerleave', leave); host.removeEventListener('pointercancel', leave);
    };
  }, []);
  return <div ref={layer} className="glass-interaction" aria-hidden="true"><i className="glass-grid" /><i className="glass-pointer" /><i className="glass-ring" /></div>;
}
