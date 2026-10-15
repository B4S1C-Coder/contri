import { GitHubClient, GitHubError, type Repository } from './github';
import { activity, firstTeamReply, isBot, isTeam, parseRepo, type Pull, type Issue, type Reply } from './metrics';
export type Repo = Repository & { language: string | null; forks_count: number; default_branch: string; };
export type Item = Pull & Issue & { state: string; assignees?: Array<{ login: string }>; repository_url: string };
export type Event = { at: string; url: string; kind: string; login: string; association?: string };
export type Sample = { number: number; title: string; url: string; createdAt: string; hours: number | null; response?: Event; partial: boolean };
export type Member = { login: string; association: string; responses: number; reviews: number; latest: Event };
export type LinkedPR = { number: number; title: string; html_url: string; state: string; draft: boolean; merged_at: string | null };
export type LinkCheck = { state: 'open' | 'clear' | 'incomplete'; prs: LinkedPR[]; checkedAt: string; note: string };
export function timing(values: Array<number | null>) {
  const answered = values.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a,b) => a-b);
  const n = answered.length;
  return { sampled: values.length, answered: n, unanswered: values.length-n,
    averageHours: n ? answered.reduce((a,b) => a+b,0)/n : null,
    medianHours: n ? (answered[Math.floor((n-1)/2)]+answered[Math.floor(n/2)])/2 : null, sufficient: n >= 3 };
}
export function linkState(prs: Pick<LinkedPR,'state'|'draft'|'merged_at'>[], complete: boolean): LinkCheck['state'] {
  return prs.some(p => p.state === 'open') ? 'open' : complete ? 'clear' : 'incomplete';
}
function path(repo: string) { const name = parseRepo(repo); if (!name) throw new Error('Enter a valid owner/repository.'); return `/repos/${name}`; }
export async function publicRepo(repo: string, signal?: AbortSignal): Promise<Repo> {
  const value = await new GitHubClient().get<Repo>(path(repo),signal);
  if (value.private) throw new Error('Only public repositories are supported.');
  return value;
}
const nowISO = () => new Date().toISOString();
const since = () => new Date(Date.now()-90*86400000).toISOString();
export async function overviewActivity(repo: string, signal?: AbortSignal) {
  await publicRepo(repo,signal); const client = new GitHubClient(); const base=path(repo);
  const warnings: string[]=[];
  async function optional<T>(name: string, endpoint: string): Promise<T|null> {
    try { return await client.get<T>(endpoint,signal); } catch(e) { if(signal?.aborted) throw e; warnings.push(`${name}: ${e instanceof Error ? e.message : 'Unavailable'}`); return null; }
  }
  type Commit = { author: {login:string;type?:string}|null; html_url:string; commit:{author:{date:string}} };
  const pulls=await optional<Pull[]>('PR activity',`${base}/pulls?state=all&sort=updated&direction=desc&per_page=100`);
  const commits=await optional<Commit[]>('Commit activity',`${base}/commits?since=${encodeURIComponent(since())}&per_page=100`);
  const counts = await Promise.all(['issue','pr'].map(kind => optional<{total_count:number;incomplete_results:boolean}>(`Open ${kind} count`,`/search/issues?q=${encodeURIComponent(`repo:${repo} is:${kind} is:open`)}&per_page=1`)));
  const release=await optional<{published_at:string;html_url:string;name:string}>('Latest release',`${base}/releases/latest`);
  const events: Event[]=[];
  for(const p of pulls||[]) if(p.merged_at && !isBot(p.user)) events.push({at:p.merged_at,url:p.html_url,kind:'Human PR merged',login:p.user!.login});
  for(const c of commits||[]) if(!isBot(c.author)) events.push({at:c.commit.author.date,url:c.html_url,kind:'Linked human commit',login:c.author!.login});
  const latest=events.filter(e=>Date.parse(e.at)<=Date.now()).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0]||null;
  const merges=(pulls||[]).filter(p=>p.merged_at && Date.parse(p.merged_at)>=Date.parse(since()) && !isBot(p.user)).map(p=>(Date.parse(p.merged_at!)-Date.parse(p.created_at))/3600000).filter(n=>n>=0);
  return { metrics:activity(pulls||[],commits||[],new Date()),available:{pulls:pulls!==null,commits:commits!==null},limited:{pulls:pulls?.length===100,commits:commits?.length===100},openIssues:counts[0]?.incomplete_results?null:counts[0]?.total_count??null,openPRs:counts[1]?.incomplete_results?null:counts[1]?.total_count??null,release,latest,mergeTiming:timing(merges),warnings,checkedAt:nowISO() };
}
export type ActivityReport = Awaited<ReturnType<typeof overviewActivity>>;
async function history<T>(client:GitHubClient,url:string,signal?:AbortSignal) {
  const values:T[]=[]; let complete=false;
  for(let page=1;page<=3;page++) { const rows=await client.get<T[]>(`${url}${url.includes('?')?'&':'?'}per_page=100&page=${page}`,signal); values.push(...rows); if(rows.length<100){complete=true;break;} }
  return {values,complete};
}
export async function teamEvidence(repo:string,signal?:AbortSignal) {
  await publicRepo(repo,signal); const client=new GitHubClient(); const base=path(repo);
  const warnings:string[]=[]; const members=new Map<string,Member>(); const humanEvents:Event[]=[];
  const groups:{pr:Sample[];issue:Sample[]}={pr:[],issue:[]};
  for(const kind of ['pr','issue'] as const) {
    let items:Item[];
    try {
      const found=await client.get<{items:Item[];incomplete_results:boolean}>(`/search/issues?q=${encodeURIComponent(`repo:${repo} is:${kind} created:>=${since().slice(0,10)}`)}&sort=created&order=desc&per_page=100`,signal);
      if(found.incomplete_results || found.items.length===100) warnings.push(`${kind} candidate search is limited; up to 100 newest candidates checked.`);
      items=found.items.filter(p=>!p.draft&&!isBot(p.user)&&['NONE','FIRST_TIMER','FIRST_TIME_CONTRIBUTOR','CONTRIBUTOR'].includes(p.author_association||'')).slice(0,20);
    } catch(e) { if(signal?.aborted)throw e;warnings.push(`${kind} samples unavailable: ${e instanceof Error?e.message:'Request failed'}`);continue; }
    for(const item of items) {
      if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
      try {
        type R=Reply & {html_url:string; kind?:string};
        const comments=await history<R>(client,`${base}/issues/${item.number}/comments`,signal);
        const reviews=kind==='pr'?await history<R>(client,`${base}/pulls/${item.number}/reviews`,signal):{values:[],complete:true};
        const inline=kind==='pr'?await history<R>(client,`${base}/pulls/${item.number}/comments`,signal):{values:[],complete:true};
        const replies=[...comments.values.map(r=>({...r,kind:'Comment'})),...reviews.values.map(r=>({...r,kind:'Review'})),...inline.values.map(r=>({...r,kind:'Inline review'}))];
        const valid=replies.filter(r=>!isBot(r.user)&&Date.parse(r.created_at||r.submitted_at||'')>=Date.parse(item.created_at)&&Date.parse(r.created_at||r.submitted_at||'')<=Date.now());
        const eligible=valid.filter(r=>isTeam(r.author_association)&&r.user!.login.toLowerCase()!==item.user!.login.toLowerCase());
        const toEvent=(r:R):Event=>({at:r.created_at||r.submitted_at!,url:r.html_url,kind:r.kind||'Comment',login:r.user!.login,association:r.author_association});
        humanEvents.push(...valid.map(toEvent));
        for(const r of eligible) {
          const event=toEvent(r), key=event.login.toLowerCase(), old=members.get(key);
          members.set(key,{login:event.login,association:r.author_association!,responses:(old?.responses||0)+1,reviews:(old?.reviews||0)+(r.kind?.includes('review')||r.kind==='Review'?1:0),latest:!old||Date.parse(event.at)>Date.parse(old.latest.at)?event:old.latest});
        }
        const partial=![comments,reviews,inline].every(h=>h.complete);
        if(partial)warnings.push(`${kind} #${item.number}: history capped at 300 items per endpoint; timing excluded.`);
        const response=eligible.map(toEvent).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))[0];
        groups[kind].push({number:item.number,title:item.title,url:item.html_url,createdAt:item.created_at,hours:firstTeamReply(item,valid),response,partial});
      }catch(e){if(signal?.aborted)throw e;warnings.push(`${kind} #${item.number}: history unavailable and excluded. ${e instanceof Error?e.message:''}`);if(client.remaining!==null&&client.remaining<=3)break;}
    }
  }
  const people=[...members.values()].sort((a,b)=>Date.parse(b.latest.at)-Date.parse(a.latest.at));
  return { groups,summary:{pr:timing(groups.pr.filter(s=>!s.partial).map(s=>s.hours)),issue:timing(groups.issue.filter(s=>!s.partial).map(s=>s.hours))},members:people,latestTeam:people[0]?.latest||null,latestHuman:humanEvents.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0]||null,warnings,checkedAt:nowISO() };
}
export type TeamReport=Awaited<ReturnType<typeof teamEvidence>>;
export async function documents(repo:string,signal?:AbortSignal) {
  const metadata=await publicRepo(repo,signal);
  try{return await new GitHubClient().get<{files:Record<string,{html_url:string}|null>}>(`${path(repo)}/community/profile`,signal);}
  catch(e){if(signal?.aborted)throw e;return {files:{},note:metadata.fork?'Community profile unavailable for this fork. Check upstream documentation.':e instanceof Error?e.message:'Documentation unavailable'};}
}
export type IssueQuery={repo:string;label:string;query:string;unassigned:boolean;sort:'updated'|'created';page:number};
export async function searchIssues(input:IssueQuery,signal?:AbortSignal) {
  await publicRepo(input.repo,signal);
  const label=input.label==='beginner'?'label:"good first issue","help wanted"':input.label?`label:"${input.label}"`:'';
  // Qualifier overrides are not accepted in free text: repository/public scope stays fixed.
  const words=input.query.replace(/[^\p{L}\p{N} _-]/gu,' ').trim().slice(0,100);
  const q=`repo:${input.repo} is:issue is:open ${label} ${input.unassigned?'no:assignee':''} ${words}`;
  const result=await new GitHubClient().get<{items:Item[];total_count:number;incomplete_results:boolean}>(`/search/issues?q=${encodeURIComponent(q)}&sort=${input.sort}&order=desc&per_page=30&page=${input.page}`,signal);
  return {...result,items:result.items.filter(i=>!i.pull_request&&!i.locked)};
}
export async function checkIssue(repo:string,number:number,signal?:AbortSignal):Promise<LinkCheck> {
  await publicRepo(repo,signal); const client=new GitHubClient(); const prs:LinkedPR[]=[];let complete=true;
  try {
    const timeline=await history<{event:string;source?:{issue?:{pull_request?:{url:string}}}}>(client,`${path(repo)}/issues/${number}/timeline`,signal);
    complete=timeline.complete;
    const urls=[...new Set(timeline.values.map(e=>e.source?.issue?.pull_request?.url).filter((u):u is string=>Boolean(u)))];
    for(const url of urls) {
      const match=/^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/.exec(url);
      if(!match){complete=false;continue;}
      try{await publicRepo(match[1],signal);prs.push(await client.get<LinkedPR>(`/repos/${match[1]}/pulls/${match[2]}`,signal));}catch(e){if(signal?.aborted)throw e;complete=false;}
    }
  }catch(e){if(signal?.aborted)throw e;complete=false;}
  return {state:linkState(prs,complete),prs,checkedAt:nowISO(),note:complete?'Public timeline references checked. References may be unrelated; unlinked work can exist.':'Timeline or referenced PRs could not be checked completely.'};
}
