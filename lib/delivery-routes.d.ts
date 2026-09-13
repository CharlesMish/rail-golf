import type { ShotSetup, VectorLike, Hole, MechanismTag } from './rail-golf-v02';
export type DeliveryRoute = 'direct' | 'sky' | 'skip' | 'mill';
export type DeliveryBook = Partial<Record<DeliveryRoute, ShotSetup>>;
export const DELIVERY_ROUTES: readonly { id: DeliveryRoute; label: string; hint: string }[];
export const DELIVERY_BOOK_KEY: string;
export const LEGACY_DELIVERY_BOOK_KEY: string;
export function readDeliveryBook(current:unknown,legacy:unknown):DeliveryBook;
export const SKY_TOKEN: Readonly<VectorLike & {radius: number}>;
export function segmentTokenIntersection(start: VectorLike, end: VectorLike, token?: VectorLike & {radius:number}): number|null;
export function collectDeliveryStepEvents(start: VectorLike, end: VectorLike, hole: Omit<Hole,"target">, tags?: MechanismTag[], routes?: DeliveryRoute[]): Array<{kind: MechanismTag|'sky'|'wet'|'first-kiss'; amount:number; point:VectorLike}>;
export function padImpulse(velocity: VectorLike, hole: Omit<Hole,"target">): VectorLike;
export function earnedDeliveryRoutes(clear:boolean, routes:DeliveryRoute[], touchedSolid:boolean, mechanismTags?:MechanismTag[]): DeliveryRoute[];
export function normalizeDeliveryBook(value:unknown): DeliveryBook;

export function withSharedYardPad<T extends Omit<Hole,"target">>(hole: T):T;
