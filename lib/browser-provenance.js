// Document-scoped identity survives React remounts, not a full document reload.
// sessionStorage holds identity ONLY; no game selection or setup is resumed here.
const DOCUMENT_KEY=Symbol.for('rail-golf.line-document.v1');
const TAB_KEY='rail-golf:line-tab-id:v1';
export function getDocumentProvenance(win,doc,uuid=()=>globalThis.crypto.randomUUID()){
 if(doc[DOCUMENT_KEY])return doc[DOCUMENT_KEY];
 let tabId,storageWarning='',tabIdentitySource='existing-session';
 try{tabId=win.sessionStorage.getItem(TAB_KEY);if(!tabId){tabId=uuid();tabIdentitySource='new-session';win.sessionStorage.setItem(TAB_KEY,tabId);}
  else {try{if(win.opener?.sessionStorage.getItem(TAB_KEY)===tabId){tabId=uuid();tabIdentitySource='cloned-opener-separated';win.sessionStorage.setItem(TAB_KEY,tabId);}}catch{/* Cross-origin opener identity is intentionally inaccessible. */}}}
 catch(error){tabId=uuid();storageWarning='Tab identity is memory-only: '+String(error);}
 const documentId=uuid(),timeOrigin=win.performance?.timeOrigin??null;
 let mountNumber=0;
 const base={documentId,timeOrigin,storageWarning,tabIdentitySource};
 const identity={
  documentId,
  // An explicit collision recovery is used when a browser clones sessionStorage
  // into a second concurrently open lab tab. Document IDs stay unambiguous.
  tabId:()=>tabId,
  rotateTab:()=>{const old=tabId;tabId=uuid();try{win.sessionStorage.setItem(TAB_KEY,tabId);}catch{}return old;},
  mount(componentId){return {componentId,mountId:uuid(),mountNumber:++mountNumber};},
  snapshot(){const navigation=win.performance?.getEntriesByType?.('navigation')?.[0];return {...base,tabId,
   url:String(win.location.href),path:String(win.location.pathname),hash:String(win.location.hash),
   visibility:doc.visibilityState,wasDiscarded:typeof doc.wasDiscarded==='boolean'?doc.wasDiscarded:null,
   navigationType:navigation?.type??'unknown',readyState:doc.readyState};},
 };
 Object.defineProperty(doc,DOCUMENT_KEY,{value:identity});return identity;
}

export function observeBrowserLifecycle({win,doc,canvas,identity,record}){
 const remove=[];
 const listen=(target,name,fn)=>{target?.addEventListener(name,fn);remove.push(()=>target?.removeEventListener(name,fn));};
 const text=value=>String(value??'').slice(0,1500);
 for(const name of ['pageshow','pagehide'])listen(win,name,event=>record(name,{persisted:event.persisted===true}));
 for(const name of ['visibilitychange','freeze','resume'])listen(doc,name,()=>record(name,{}));
 listen(win,'popstate',()=>record('popstate',{}));
 listen(win,'hashchange',event=>record('hashchange',{oldURL:text(event.oldURL),newURL:text(event.newURL)}));
 // beforeunload intentionally omitted: it can prevent bfcache. pagehide is observational.
 listen(win,'error',event=>record('error',{message:text(event.message),filename:text(event.filename),line:event.lineno??null,column:event.colno??null}));
 listen(win,'unhandledrejection',event=>record('unhandledrejection',{message:text(event.reason?.message??event.reason)}));
 for(const name of ['webglcontextlost','webglcontextrestored'])listen(canvas,name,event=>record(name,{statusMessage:text(event.statusMessage)}));
 // Never preventDefault, reload, restore game state or suppress an error here.
 record('lifecycle-observer-start',{pageshowMayHavePrecededObserver:doc.readyState==='complete',duplicateTabDetection:win.BroadcastChannel?'local-channel':'unavailable'});
 // Detect cloned sessionStorage IDs without a service, server or gameplay changes.
 let channel=null;
 const startChannel=()=>{try{if(win.BroadcastChannel&&!channel){
  channel=new win.BroadcastChannel('rail-golf-line-tab-identity');
  channel.onmessage=event=>{
   const m=event.data;if(m?.type!=='identity-probe'||m.tabId!==identity.tabId()||m.documentId===identity.documentId)return;
   const ours=identity.snapshot();
   // Keep the earlier document's identity; the newer document adopts a fresh tab.
   const newer=(ours.timeOrigin??0)>(m.timeOrigin??0)||((ours.timeOrigin??0)===(m.timeOrigin??0)&&ours.documentId>m.documentId);
   if(newer){const previousTabId=identity.rotateTab();record('tab-identity-collision',{previousTabId,otherDocumentId:m.documentId});}
   else channel?.postMessage({type:'identity-probe',tabId:ours.tabId,documentId:ours.documentId,timeOrigin:ours.timeOrigin});
  };
  const ours=identity.snapshot();channel.postMessage({type:'identity-probe',tabId:ours.tabId,documentId:ours.documentId,timeOrigin:ours.timeOrigin});
 }}catch(error){record('identity-channel-unavailable',{message:text(error)});}};
 const stopChannel=()=>{channel?.close();channel=null;};
 startChannel();
 listen(win,'pagehide',stopChannel);listen(win,'pageshow',startChannel);
 listen(doc,'freeze',stopChannel);listen(doc,'resume',startChannel);
 return ()=>{remove.forEach(fn=>fn());channel?.close();};
}
