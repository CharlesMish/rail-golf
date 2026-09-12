import type {ShotSetup} from './rail-golf-v02';
import type {FloorEnvironment} from './diverter-lab';
export type ShareLineV1={v:1;build:string;world:'timber-courtyard';route:'/lab/lines'|'/lab/courtyard-diverter';card:string;station:string;rail:number;yaw:number;elevation:number;speed:number;environment:FloorEnvironment};
export const SHARE_WORLD:'timber-courtyard';
export function validateShareLine(value:unknown):ShareLineV1;
export function encodeShareLine(value:ShareLineV1):string;
export function decodeShareLine(value:string):ShareLineV1;
export function restoreShareLine(value:ShareLineV1,currentBuild:string):{route:string;card:string;station:string;setup:ShotSetup;environment:FloorEnvironment;powerMode:'set';autoFire:false;warning:string};
