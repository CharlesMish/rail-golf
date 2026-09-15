export type BrowserIdentity={tabId:string;documentId:string;timeOrigin:number|null;tabIdentitySource:string;storageWarning:string;url:string;path:string;hash:string;visibility:string;wasDiscarded:boolean|null;navigationType:string;readyState:string};
export type MountIdentity={componentId:string;mountId:string;mountNumber:number};
export type DocumentProvenance={documentId:string;tabId:()=>string;rotateTab:()=>string;mount:(componentId:string)=>MountIdentity;snapshot:()=>BrowserIdentity};
export function getDocumentProvenance(win:Window,doc:Document,uuid?:()=>string):DocumentProvenance;
export function observeBrowserLifecycle(options:{win:Window;doc:Document;canvas:HTMLCanvasElement|null;identity:DocumentProvenance;record:(event:string,detail:Record<string,unknown>)=>void}):()=>void;
