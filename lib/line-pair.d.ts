export const STORAGE_PREFIX: string;
export const SURVEY_DATABASE: string;
export const EXPORT_FILENAME: string;
export const CLASSIFIER_SHA: string;

export type PairCode = string;
export type PairSetup = {yaw: number; elevation: number; charge: number; rail: number; origin: number};
export type PairShot = {
  armCode: string;
  build: string;
  station: string;
  lineNumber: number | null;
  relationAction: string | null;
  parentAttemptId: string | null;
  setup: PairSetup;
  setupDelta: PairSetup | null;
  terminal: {x: number; y: number; z: number; surface: string | null; reason: string};
  card: {sequence: string; ending: string; parentLine: string | null};
  receipt: unknown;
  termination: string;
  rulingLockAt: string;
  leaveResult: {action: string; at: string} | null;
  inputLog: {at: string; source: string; name: string; control: string}[];
  pool: 'REQUIRED' | 'VOLUNTARY' | 'INTERRUPTED';
  attemptId: string | null;
};

export function readLinePair(value: string | null | undefined): string | null;
export function showsParentLine(code: string): boolean;
export function linePairStorage(storage: {length: number; key(index: number): string | null; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void}): {length: number; key(index: number): string | null; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; clear(): void};
export function parentLineFrom(parent: {lineNumber: number | null; card: {sequence: string; ending: string}} | null, kept: boolean): string | null;
export function parentLineSegments(text: string): string[];
export function signedSetupDelta(child: PairSetup, parent: PairSetup | null): PairSetup | null;
export function createPairRecord(input: {code: string; build: string}): {
  shotByAttempt(id: string): PairShot | null;
  lockedCount(): number;
  noteInput(event: {at: string; source: string; name: string; control: string}): void;
  dropLastInput(): void;
  armFire(): void;
  noteLeave(action: string, at: string): boolean;
  lock(input: {
    attemptId?: string | null;
    station: string;
    setup: PairSetup;
    terminal: {reason: string; surface?: string | null; point: {x: number; y?: number; z: number}};
    ledger?: readonly {kind: string; label?: string; surface?: string; feature?: string; members?: string[]; terminal?: boolean}[];
    receipt: unknown;
    termination: string;
    relation?: {action: string; attemptId?: string | null} | null;
    at: string;
  }): PairShot;
  setSession(input?: {fps?: number | null; viewport?: {width: number; height: number} | null}): void;
  exportDocument(): {fps: number | null; viewport: {width: number; height: number} | null; classifierSha: string; shots: PairShot[]};
  visibleParent(record: PairShot | null): string | null;
};
