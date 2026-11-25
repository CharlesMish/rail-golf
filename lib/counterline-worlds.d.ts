import type {WorldcraftDocument,WorldcraftSetup} from './worldcraft-model';
import type {CounterlineProfile} from './counterline-recording';
export type CounterlineWorld={id:string;label:string;world:WorldcraftDocument;opening:WorldcraftSetup;originalOpening:WorldcraftSetup;entryLabel:string;invitation:string;profile:CounterlineProfile;foundryId:string|null};
export function counterlineWorlds(earlyPlate:WorldcraftDocument):CounterlineWorld[];
export function counterlineControls(world:WorldcraftDocument):Record<'originX'|'yaw'|'elevation'|'charge',[number,number]>;
export function counterlineSetup(world:WorldcraftDocument,current:WorldcraftSetup,patch:Partial<WorldcraftSetup>):WorldcraftSetup;
export function counterlineWorldMatch(worlds:CounterlineWorld[],world:WorldcraftDocument):CounterlineWorld|null;
