'use strict';
// Pure policy, also exercised by node:test. Never deploy fork/PR code with Pages permissions.
function verifyDeployment({eventName,event,sha,ref,repository,mainSha,runs}){
  const candidate=eventName==='workflow_run'?event?.workflow_run?.head_sha:sha;
  if(!/^[a-f0-9]{40}$/.test(candidate||'')||candidate!==mainSha)throw Error('Candidate is not current main');
  if(eventName==='workflow_run'){
    const r=event.workflow_run;
    if(r.name!=='Quality'||r.event!=='push'||r.head_branch!=='main'||r.head_repository?.full_name!==repository||r.status!=='completed'||r.conclusion!=='success')
      throw Error('Trigger is not a successful trusted main Quality run');
  }else if(eventName!=='workflow_dispatch'||ref!=='refs/heads/main')throw Error('Unsupported deployment trigger');
  const relevant=(runs||[]).filter(r=>r.head_sha===candidate&&r.head_branch==='main'&&r.event==='push')
    .sort((a,b)=>b.id-a.id);
  if(!relevant.length||relevant[0].status!=='completed'||relevant[0].conclusion!=='success')
    throw Error('Latest Quality run for candidate is not successful');
  return candidate;
}
module.exports={verifyDeployment};
