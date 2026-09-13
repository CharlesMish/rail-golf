import type {VectorLike} from './rail-golf-v02';
export type FollowFrame={position:VectorLike;target:VectorLike;fov:number};
export function followOffsets(ball:VectorLike,velocity:VectorLike,direction:VectorLike):Omit<FollowFrame,'fov'>;
export function projectileScreen(frame:FollowFrame,ball:VectorLike,aspect:number,horizontal?:boolean):{x:number;y:number;depth:number};
export function advanceFlightCamera(frame:FollowFrame,ball:VectorLike,previousBall:VectorLike|null,desired:Omit<FollowFrame,'fov'>,dt:number,aspect:number,horizontal?:boolean,baseFov?:number):FollowFrame;

export function followHeading(direction:VectorLike,velocity:VectorLike,dt:number):VectorLike;
