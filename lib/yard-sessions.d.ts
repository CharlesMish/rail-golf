import type { HoleRecord } from './rail-golf-v02';
import type { GameCard } from './line-lab';

export const YARD_SESSIONS_PROGRESS_KEY: 'rail-golf-yard-sessions-v1';
export const YARD_SESSIONS_LIBRARY_SUFFIX: '-yard-sessions-v1';
export const YARD_SESSIONS_LIBRARY_KEY: string;
export const YARD_SESSIONS_SURVEY_DATABASE: 'rail-golf-yard-sessions-survey';
export const YARD_SESSIONS_MESSAGE: string;
export const YARD_SESSION_NEST_RADIUS: number;

export type YardSessionMode = { readonly set: '1' | '2'; readonly dare: boolean };
export type YardSessionParse = { ok: true; mode: YardSessionMode } | { ok: false; message: string };

export function parseYardSessionQuery(set: unknown): YardSessionParse;
export function yardSessionHole(set: '1' | '2'): GameCard;
export function yardSessionPrefix(set: '1' | '2'): string;
export function yardSessionStorage(storage: Storage, set: '1' | '2'): Storage;
export function yardSessionOwnsKey(key: string): boolean;
export function yardSessionKeyCollides(key: string): boolean;
export function readYardSessionRecords(raw: unknown, set: '1' | '2', holes: readonly { id: string }[]): Record<string, HoleRecord>;
export function writeYardSessionProgress(previous: unknown, set: '1' | '2', records: Record<string, HoleRecord | undefined>): { version: 1; sets: Record<string, Record<string, unknown>> };
export function readYardSessionLibrary(raw: unknown, set: '1' | '2', holeId: string): { version: 1; holes: Record<string, { recent: unknown[]; wins: unknown[] }> };
export function writeYardSessionLibrary(previous: unknown, set: '1' | '2', holeId: string, shelf: { recent?: unknown[]; wins?: unknown[] } | undefined): { version: 1; sets: Record<string, Record<string, unknown>> };
