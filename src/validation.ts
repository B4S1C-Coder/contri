import {normalizeSaved} from './brief';
import { parseRepo } from './metrics';
import type { Message } from './protocol';
export function validateMessage(value:unknown, trusted:boolean):Message {
  if(!value||typeof value!=='object')throw new Error('Invalid request');
  const {op,input}=value as {op:string;input:Record<string,unknown>};
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid input');
  const allowed=['repo','activity','team','documents','issues','links','search','connection','settings','refresh','position','saved','save','removeSaved',...(trusted?['connect','disconnect']:[])];
  if(!allowed.includes(op))throw new Error('Operation not allowed');
  if(['repo','activity','team','documents','issues','links'].includes(op)) {
    if(typeof input.repo!=='string'||parseRepo(input.repo)!==input.repo)throw new Error('Invalid repository');
  }
  if(op==='links'&&(!Number.isSafeInteger(input.number)||(input.number as number)<1))throw new Error('Invalid issue number');
  if(op==='search'&&(typeof input.query!=='string'||input.query.length>200||!input.query.trim()))throw new Error('Invalid search');
  if(op==='issues'&&(!['','beginner','good first issue','help wanted','documentation','bug'].includes(String(input.label))||!['updated','created'].includes(String(input.sort))||typeof input.query!=='string'||input.query.length>100||typeof input.unassigned!=='boolean'||!Number.isInteger(input.page)||(input.page as number)<1||(input.page as number)>10))throw new Error('Invalid issue filters');
  if(op==='position'&&['x','y'].some(k=>input[k]!==undefined&&(typeof input[k]!=='number'||!Number.isFinite(input[k])||Math.abs(input[k] as number)>100000)))throw new Error('Invalid position');
  if(op==='connect'&&(typeof input.token!=='string'||typeof input.remember!=='boolean'))throw new Error('Invalid connection request');
  if(op==='save'&&input.updateNote!==undefined&&typeof input.updateNote!=='boolean')throw new Error('Invalid note update');
  if(op==='save') normalizeSaved(input.item as Parameters<typeof normalizeSaved>[0]);
  if(op==='removeSaved'&&(typeof input.url!=='string'||input.url.length>500))throw new Error('Invalid saved item');
  return {op,input} as Message;
}
