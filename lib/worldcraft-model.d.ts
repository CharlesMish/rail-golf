export type WorldcraftKind='bank'|'ramp'|'block';
export type WorldcraftObject={id:string;kind:WorldcraftKind;x:number;z:number;yaw:number};
export type WorldcraftRules={pin:{x:number;z:number;r:number};locked:string[];allowance:Partial<Record<WorldcraftKind,number>>;rail:{yaw:number;elevation:number;charge:number}|null};
export type WorldcraftPinResult={status:'clear'|'miss'|'unfinished';distance:number|null};
export type WorldcraftDocument={format:'rail-golf-worldcraft';version:1;id:string;name:string;environment:{preset:'forest-clearing-v1';seed:1};objects:WorldcraftObject[];launcher:{x:number};rules:WorldcraftRules|null};
export type WorldcraftSetup={railIndex:1;originX:number;yaw:number;elevation:number;charge:number};
export type WorldcraftPoint={x:number;y:number;z:number;t?:number};
export type WorldcraftJSON=null|boolean|number|string|WorldcraftJSON[]|{[key:string]:WorldcraftJSON};
export type WorldcraftSnapshot={version:1;world:WorldcraftDocument;worldIdentity:string;catalog:'worldcraft-prefabs-v1';physics:'rail-golf-v02-worldcraft-v1';build:string};
export type WorldcraftTerminal={reason:string;[key:string]:WorldcraftJSON};
export type WorldcraftLaunch={station:{id:string;label:string;x:number;z:number;yaw:number};muzzle:{x:number;y:number;z:number};rail:{x:number;y:number;z:number};aim:{x:number;y:number;z:number};direction:{x:number;y:number;z:number};speed:number;mass:number;radius:number};
export type WorldcraftContact={body:string;point:{x:number;y:number;z:number};count:number;first:number;last:number};
export type WorldcraftLine={version:1;id:string;createdAt:string;worldSnapshot:WorldcraftSnapshot;setup:WorldcraftSetup;launch:WorldcraftLaunch;points:WorldcraftPoint[];events:WorldcraftJSON[];contacts:WorldcraftContact[];terminal:WorldcraftTerminal};
export type WorldcraftSavedWorld={id:string;savedAt:string;world:WorldcraftDocument};
export type WorldcraftStoreStatus={warning:string;memoryOnly:boolean;worldCount:number;lineCount:number};
export type WorldcraftSaveResult<T>={entry:T;persisted:boolean;status:WorldcraftStoreStatus};
export const WORLDCRAFT_FORMAT:'rail-golf-worldcraft';
export const WORLDCRAFT_VERSION:1;
export const WORLDCRAFT_CATALOG_VERSION:'worldcraft-prefabs-v1';
export const WORLDCRAFT_PHYSICS_CONTRACT:'rail-golf-v02-worldcraft-v1';
export const WORLDCRAFT_STORAGE_PREFIX:'rail-golf:worldcraft:v1:';
export const WORLDCRAFT_LIMITS:Readonly<{objects:12;worldSlots:4;lineSlots:4;importBytes:32768;lineBytes:262144;points:2048;events:1024;history:100}>;
export const WORLDCRAFT_BOUNDS:Readonly<{minX:-30;maxX:30;minZ:10;maxZ:96}>;
export const WORLDCRAFT_LAUNCHER_CORRIDOR:Readonly<{minX:-12;maxX:12;minZ:-8;maxZ:10}>;
export const WORLDCRAFT_GRID:Readonly<{coarse:1;fine:.5;rotation:15;fineRotation:5;launcher:.5}>;
export const WORLDCRAFT_CATALOG:Readonly<Record<WorldcraftKind,Readonly<{label:string;width:number;height:number;depth:number;centerY:number;pitch:number;friction:number;restitution:number}>>>;
export function newWorldcraftId(prefix?:string):string;
export function worldcraftFootprint(object:WorldcraftObject):{x:number;z:number;halfX:number;halfZ:number;ux:{x:number;z:number};uz:{x:number;z:number};corners:{x:number;z:number}[]};
/** Returns a canonical independent copy; rejects rather than repairing input. */
export function validateWorld(value:unknown):WorldcraftDocument;
export function parseWorldJSON(text:string):WorldcraftDocument;
export function exportWorldJSON(world:WorldcraftDocument):string;
export function createEmptyWorld(options?:{id?:string;name?:string}):WorldcraftDocument;
export const createBlankWorld:typeof createEmptyWorld;
export function createStarterWorld(options?:{id?:string;name?:string}):WorldcraftDocument;
/** Exact canonical scene JSON; independent of document name/id and object array order. */
export function worldcraftIdentity(world:WorldcraftDocument):string;
export function validateWorldcraftSetup(value:unknown):WorldcraftSetup;
/** Deeply frozen fire/play provenance. Historical builds remain explicitly identified. */
export function captureWorldSnapshot(world:WorldcraftDocument,build:string):WorldcraftSnapshot;
export function lineMatchesWorld(line:WorldcraftLine,world:WorldcraftDocument):boolean;
export function createWorldHistory(initial:WorldcraftDocument):{
 current():WorldcraftDocument;
 status():{canUndo:boolean;canRedo:boolean;revision:number};
 commit(next:WorldcraftDocument):WorldcraftDocument;
 undo():WorldcraftDocument;
 redo():WorldcraftDocument;
 reset(next:WorldcraftDocument):WorldcraftDocument;
};
/** Preserves actual supplied samples/events; rejects oversized records instead of silently truncating. */
export function packWorldcraftLine(input:{id?:string;createdAt?:string;worldSnapshot:WorldcraftSnapshot;setup:WorldcraftSetup;launch:WorldcraftLaunch;points:WorldcraftPoint[];events:unknown[];contacts:WorldcraftContact[];terminal:WorldcraftTerminal}):WorldcraftLine;
export function createWorldcraftStore(storage:Pick<Storage,'getItem'|'setItem'>):{
 worlds():WorldcraftSavedWorld[];
 lines():WorldcraftLine[];
 status():WorldcraftStoreStatus;
 saveWorld(world:WorldcraftDocument,options?:{replaceId?:string}):WorldcraftSaveResult<WorldcraftSavedWorld>;
 keepLine(line:WorldcraftLine):WorldcraftSaveResult<WorldcraftLine>;
 removeWorld(id:string):boolean;
 removeLine(id:string):boolean;
 /** Recovery/export only; this envelope cannot be imported as a playable world. */
 exportLocal():string;
};

export function validateWorldEdit(current:WorldcraftDocument,input:unknown):WorldcraftDocument;
export function worldcraftFixedSetup(world:WorldcraftDocument):WorldcraftSetup|null;
export function worldcraftSetupForWorld(world:WorldcraftDocument,current:WorldcraftSetup,options?:{load?:boolean}):WorldcraftSetup;
export function validateWorldcraftShot(world:WorldcraftDocument,input:unknown):WorldcraftSetup;
export function worldcraftCanAdd(world:WorldcraftDocument,kind:WorldcraftKind):boolean;
export function worldcraftPinResult(world:WorldcraftDocument,terminal:unknown):WorldcraftPinResult|null;
export function createHouseShotWorld():WorldcraftDocument;
