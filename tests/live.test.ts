import { expect,it } from 'vitest';
import process from 'node:process';
import { publicRepo,overviewActivity } from '../src/evidence';
const enabled=process.env.CONTRI_LIVE==='1';
for(const repo of ['pallets/flask','alphasafal/contributor-compass','jquery/jquery-mobile']) {
 it.skipIf(!enabled)(`live public evidence: ${repo}`,async()=>{
  const metadata=await publicRepo(repo);expect(metadata.private).toBe(false);
  const report=await overviewActivity(repo);
  expect(report.metrics.weeks.reduce((n,w)=>n+w.count,0)).toBe(report.metrics.merged);
  console.log(JSON.stringify({repo,archived:metadata.archived,pushedAt:metadata.pushed_at,activity:report.metrics.merged,authors:report.metrics.authors,commits:report.metrics.commits,openIssues:report.openIssues,openPRs:report.openPRs,latest:report.latest,warnings:report.warnings,checkedAt:report.checkedAt}));
 },60000);
}
