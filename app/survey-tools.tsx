'use client';
import {useState} from 'react';
import {surveyCSV,type createSurveyLog,type SurveyStatus} from '@/lib/survey-ledger';
export function SurveyTools({log,status,busy}:{log:ReturnType<typeof createSurveyLog>|null;status:SurveyStatus;busy:boolean}){
 const [confirm,setConfirm]=useState(false),[notice,setNotice]=useState('');
 const download=(name:string,content:string,type:string)=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 const exportLog=async(csv:boolean)=>{if(!log)return;try{const data=await log.export();const name='rail-survey-'+new Date().toISOString().replaceAll(':','-');download(name+(csv?'.csv':'.json'),csv?surveyCSV(data.records):JSON.stringify(data,null,2),csv?'text/csv':'application/json');setNotice(`Exported ${data.records.length} attempts${data.warning?' · '+data.warning:''}`);}catch(error){setNotice('Export failed: '+String(error));}};
 return <section className="survey-tools" aria-label="Survey log">
  <strong>SURVEY LOG · {status.count} attempts</strong>
  <small>Saved in this browser across cards, stations and reloads. Up to 2,000 attempts / 64 MiB; oldest records roll off. {status.evicted>0&&`${status.evicted} older attempts retired.`} {status.pending>0&&`${status.pending} awaiting archive.`}</small>
  {status.warning&&<p role="alert">{status.warning}</p>}
  <div><button type="button" disabled={!log} onClick={()=>exportLog(false)}>EXPORT SURVEY · JSON</button><button type="button" disabled={!log} onClick={()=>exportLog(true)}>CSV summary</button></div>
  <button type="button" disabled={!log||busy} onClick={async()=>{if(!confirm){setConfirm(true);return;}try{await log!.clear();setNotice('Survey log cleared. Saved lines unchanged.');}catch(error){setNotice('Clear failed: '+String(error));}setConfirm(false);}}>{confirm?'Confirm clear all survey attempts':'CLEAR SURVEY LOG'}</button>
  {confirm&&<button type="button" onClick={()=>setConfirm(false)}>Cancel</button>}
  {notice&&<small role="status">{notice}</small>}
 </section>;
}
