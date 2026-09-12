import { execFileSync } from 'node:child_process';
export function buildIdentity(env=process.env,git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()){
 const sha=env.WORKERS_CI_COMMIT_SHA;
 if(typeof sha==='string'&&/^[a-f0-9]{40}$/i.test(sha)) return sha.slice(0,10);
 try{
  const head=git('rev-parse','HEAD');
  if(!/^[a-f0-9]{40}$/i.test(head)) return 'unknown';
  return head.slice(0,10)+(git('status','--porcelain','--untracked-files=normal')?'-dirty':'');
 }catch{return 'unknown';}
}
