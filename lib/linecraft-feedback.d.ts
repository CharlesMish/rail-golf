import type {LineEvidence} from './line-score';
import type {ShotSetup,VectorLike} from './rail-golf-v02';
import type {captureLabLaunch} from './lab-controls';
import type {LinecraftTicketMeta,LinecraftMeta} from './linecraft-lab';
export type FeedbackShot=ShotSetup&{ledger?:LineEvidence[];contacts?:{kind:string;point:VectorLike}[];linecraftMeta?:LinecraftTicketMeta|LinecraftMeta;linecraftLaunch?:ReturnType<typeof captureLabLaunch>;shotControls?:{powerMode:'hold'|'set';max:boolean};build?:string;stationId:string;projectileId:number;environment?:{floor:'A'|'B'}};
export function linecraftPowerLabel(value:number):string;
export function linecraftFeedback(shot:FeedbackShot):{interrupted:boolean;ending:string;contacts:string;events:string;progress:string;firstKiss:boolean;lesson:ReturnType<typeof import('./linecraft-lab').matchLinecraftSentence>|null};
export function linecraftShotDetails(shot:FeedbackShot):string;
