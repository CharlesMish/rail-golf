'use client';
import {actionTraceCSV,type createActionTrace,type TraceScope} from '@/lib/action-trace';
import {useState} from 'react';
import {surveyCSV,type createSurveyLog,type SurveyStatus} from '@/lib/survey-ledger';
export function SurveyTools({log,status,busy,trace}:{log:ReturnType<typeof createSurveyLog>|null;status:SurveyStatus;busy:boolean;trace:ReturnType<typeof createActionTrace>|null}){
 const [traceScope,setTraceScope]=useState<TraceScope>('mount');
 const traceSummary=trace?.summary();
 const [confirm,setConfirm]=useState(false),[notice,setNotice]=useState('');
 const download=(name:string,content:string,type:string)=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 const exportLog=async(csv:boolean)=>{if(!log)return;try{const data=await log.export();const name='rail-survey-'+new Date().toISOString().replaceAll(':','-');download(name+(csv?'.csv':'.json'),csv?surveyCSV(data.records):JSON.stringify({...data,actionTrace:trace?.export(traceScope)},null,2),csv?'text/csv':'application/json');setNotice(`Exported ${data.records.length} attempts${data.warning?' · '+data.warning:''}${trace?.export(traceScope).warning?' · '+trace.export(traceScope).warning:''}`);}catch(error){setNotice('Export failed: '+String(error));}};
 return <section className="survey-tools" aria-label="Survey log">
  <strong>SURVEY LOG · {status.count} attempts</strong>
  <small>Saved in this browser across cards, stations and reloads. Up to 2,000 attempts / 64 MiB; oldest records roll off. {status.evicted>0&&`${status.evicted} older attempts retired.`} {status.pending>0&&`${status.pending} awaiting archive.`}</small>
  {status.warning&&<p role="alert">{status.warning}</p>}
  <div><button type="button" disabled={!log} onClick={()=>exportLog(false)}>EXPORT SURVEY · JSON</button><button type="button" disabled={!log} onClick={()=>exportLog(true)}>CSV summary</button></div>
  <small>TRACE · tab {traceSummary?.tabId?.slice(0,8)??'—'} · document {traceSummary?.documentId?.slice(0,8)??'—'} · mount {traceSummary?.mountNumber??'—'} / {traceSummary?.mountId?.slice(0,8)??'—'} · {traceSummary?.count??0} rows</small>
  <label>Trace scope <select aria-label="Action trace scope" value={traceScope} onChange={event=>setTraceScope(event.target.value as TraceScope)}>
    <option value="mount">Current mount only</option><option value="document">Current document</option><option value="tab">Current tab history</option><option value="all">All retained traces</option>
  </select></label>
  <small>Scope filters action/lifecycle traces in JSON and action CSV; attempt exports stay complete. Older traces without page identity appear only in All retained traces.</small>
  <small>JSON includes a local control-action trace (up to 5,000 actions / 1 MiB across sessions). No telemetry. Older action traces roll off independently of attempts.</small>
  <button type="button" disabled={!trace} onClick={()=>{const data=trace!.export(traceScope);download('rail-actions.csv',actionTraceCSV(data),'text/csv');setNotice(`Exported ${data.entries.length} actions · ${data.scope} · ${data.retired} retired${data.warning?' · '+data.warning:''}`);}}>Action trace · CSV</button>
  <button type="button" disabled={!log||busy} onClick={async()=>{if(!confirm){setConfirm(true);return;}try{await log!.clear();trace?.clear();setNotice('Survey and action logs cleared. Saved lines unchanged.');}catch(error){setNotice('Clear failed: '+String(error));}setConfirm(false);}}>{confirm?'Confirm clear survey and action logs':'CLEAR SURVEY LOG'}</button>
  {confirm&&<button type="button" onClick={()=>setConfirm(false)}>Cancel</button>}
  {notice&&<small role="status">{notice}</small>}
 </section>;
}
