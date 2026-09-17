import type {Scene,Mesh,TransformNode,StandardMaterial} from '@babylonjs/core';
import type {RangeRecord,RangeEvent} from './mechanism-range-session';
import type {buildDiverterLab} from './diverter-scene';
export const RANGE_EVENT_HOLD_MS:number;
export type RangeLineEvent={kind:string;label:string;feature?:string;point?:{x:number;y:number;z:number}};
export function rangeLineEvents(evidence?:RangeEvent[]):RangeLineEvent[];
export function rangeLineReceipt(record:RangeRecord|null):{events:RangeLineEvent[];terminal:string};
export function createRangeDepartureMarkers(scene:Scene):{readonly count:number;add(event:RangeEvent,now:number):boolean;update(now:number):void;clear():void;dispose():void};
export function buildRangeLegibility(scene:Scene,root:TransformNode,mechanism:ReturnType<typeof buildDiverterLab>,features:Map<string,Mesh>,materials:Record<string,StandardMaterial>):{meshes:Mesh[];update():void;dispose():void};
