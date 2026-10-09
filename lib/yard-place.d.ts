export const BAND: number;
export const STORAGE_PREFIX: string;
export const EXPORT_FILENAME: string;
export const ENDING_WORD: Readonly<Record<string, string>>;
export const PLACE_VOCABULARY: readonly string[];

export type PlacePoint = {x: number; y?: number; z: number};
export type PlaceTerminal = {reason: string; surface?: string | null; point: PlacePoint};
export type PlaceRuling = {ending: string; place: string | null; zone: string; why: string};
export type ResultView = {heading: string; sequence: string; classifier: PlaceRuling; endingLine: string};

export function placeFor(stationId: string, terminal: PlaceTerminal): PlaceRuling;
export function vocabularyViolations(phrases?: readonly string[]): string[];
export function sequenceLine(ledger: readonly {kind: string; label?: string; surface?: string; feature?: string; members?: string[]; terminal?: boolean}[]): string;
export function lifecycleBounds(point: PlacePoint | null | undefined, reason: string): string[];
export function resultView(input: {stationId: string; terminal: PlaceTerminal; ledger: readonly {kind: string; label?: string; surface?: string; feature?: string; members?: string[]; terminal?: boolean}[]; showPlace: boolean; classify?: typeof placeFor}): ResultView;
export function resultCardMarkup(view: ResultView): string;
export function yardPlaceStorage(storage: {length: number; key(index: number): string | null; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void}): {length: number; key(index: number): string | null; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; clear(): void};
export function createYardJournal(storage: {length: number; key(index: number): string | null; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void}): {filename: string; record(shot: Record<string, unknown>): unknown; exportDocument(): {shots: unknown[]; fps: number | null; viewport: unknown}};
export function shotExport(input: {code: string; build: string; station: string; setup: {yaw: number; elevation: number; charge: number; rail: number; origin: number}; ledger: unknown; receipt: unknown; termination: string; point: PlacePoint; classifier: PlaceRuling; endingLine: string; at: string; fps?: number | null; viewport?: {width: number; height: number} | null}): Record<string, unknown>;
