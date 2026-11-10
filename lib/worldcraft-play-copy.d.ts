import type { RangePreset } from './worldcraft-range';

export type FoundryPlayCopy = {
  heading: string;
  invitation: string;
  rules: string;
  playNotice: string;
};

export function foundryMovableKinds(preset: RangePreset): string[];
export function foundryRulesSentence(preset: RangePreset): string;
export function foundryPlayCopy(manifest: { name: string; invitation: string }, preset: RangePreset): FoundryPlayCopy;
export function musicalWorkshopPlayCard(): { heading: string; body: string };
export function restingPlace(world: { objects?: { id: string; kind: string; x: number; z: number; yaw: number }[] } | null | undefined, terminal: { reason?: string; position?: number[] } | null | undefined): { raised: true; kind: string; x: number; z: number; sentence: string } | null;
export function nearestCarriageStop(x: number): number | null;
export function deckExchangeSentence(contacts: { body?: string; point?: { x?: number } }[] | null | undefined): string | null;
export function returnReadout(world: { objects?: { id: string; x: number; z: number }[] } | null | undefined, contacts: { body?: string }[] | null | undefined, terminal: { position?: number[] } | null | undefined, setup: { originX?: number } | null | undefined): { sentence: string; frame: { x: number; z: number; radius: number; elevation: number; angle: number } } | null;
export function foundryOutcomeSentence(last: { goalResult?: { kind?: string; status?: string; distance?: number | null }; terminal?: { reason?: string }; reason?: string }): string;
export function foundryReceiptKind(foundryId: string | null | undefined): 'rest' | 'deck' | 'return' | null;
export function foundryReceiptParts(foundryId: string | null | undefined, world: Parameters<typeof restingPlace>[0], last: { terminal?: { reason?: string; position?: number[] }; reason?: string; position?: number[]; contacts?: { body?: string; point?: { x?: number } }[]; setup?: { originX?: number } } | null | undefined): { rest: string | null; deck: string | null; back: string | null };
export function foundryReceiptLines(world: Parameters<typeof restingPlace>[0], last: { terminal?: { reason?: string; position?: number[] }; reason?: string; position?: number[]; contacts?: { body?: string; point?: { x?: number } }[]; setup?: { originX?: number }; world?: Parameters<typeof restingPlace>[0] }, foundryId?: string | null): string[];
export function foundryShotNotice(last: Parameters<typeof foundryOutcomeSentence>[0] & { world?: Parameters<typeof restingPlace>[0]; contacts?: { body?: string; point?: { x?: number } }[]; setup?: { originX?: number }; terminal?: { reason?: string; position?: number[] } }, preset: RangePreset): string;
export function resultFraming(world: Parameters<typeof restingPlace>[0], record: { terminal?: { reason?: string; position?: number[] }; contacts?: { body?: string; point?: { x: number; y: number; z: number } }[]; setup?: { originX?: number } } | null | undefined, foundryId?: string | null): { view: 'survey'; x: number; z: number; radius: number; elevation: number; angle: number } | null;
