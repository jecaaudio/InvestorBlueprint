import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {verifyDeployment}=createRequire(import.meta.url)('./verify-pages-deploy.cjs');
const sha='a'.repeat(40),repository='jecaaudio/InvestorBlueprint';
const run={id:1,name:'Quality',event:'push',head_sha:sha,head_branch:'main',head_repository:{full_name:repository},status:'completed',conclusion:'success'};
const base={eventName:'workflow_run',event:{workflow_run:run},sha,ref:'refs/heads/main',repository,mainSha:sha,runs:[run]};
test('current trusted main with successful exact-SHA Quality may deploy',()=>assert.equal(verifyDeployment(base),sha));
test('manual dispatch needs main and completed exact-SHA Quality',()=>{
  assert.equal(verifyDeployment({...base,eventName:'workflow_dispatch'}),sha);
  assert.throws(()=>verifyDeployment({...base,eventName:'workflow_dispatch',ref:'refs/heads/develop'}));
});
test('missing, failed, running, canceled and outdated checks block deployment',()=>{
  for(const runs of [[],[{...run,conclusion:'failure'}],[{...run,status:'in_progress',conclusion:null}],[{...run,conclusion:'cancelled'}],[{...run,head_sha:'b'.repeat(40)}]])
    assert.throws(()=>verifyDeployment({...base,runs}));
});
test('older success cannot override latest failed or in-progress run',()=>{
  for(const conclusion of ['failure',null])assert.throws(()=>verifyDeployment({...base,runs:[run,{...run,id:2,status:conclusion?'completed':'in_progress',conclusion}]}));
});
test('PR, fork, branch and unrelated workflow triggers are denied',()=>{
  for(const patch of [{event:'pull_request'},{head_repository:{full_name:'attacker/fork'}},{head_branch:'feature'},{name:'Different workflow'},{conclusion:'failure'}])
    assert.throws(()=>verifyDeployment({...base,event:{workflow_run:{...run,...patch}}}));
});
test('stale main and arbitrary triggers are denied',()=>{
  assert.throws(()=>verifyDeployment({...base,mainSha:'b'.repeat(40)}));
  assert.throws(()=>verifyDeployment({...base,eventName:'push'}));
});
