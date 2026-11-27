import type {WorldcraftLine,WorldcraftPerformanceImpact} from './worldcraft-model';
import type {ResonanceImpact,SoundVariantId} from './worldcraft-resonance';
export type CounterlineProfile={version:1;dynamics:'normal-speed'|'total-speed';bankVoice:'tuned-even'|null};
export type CounterlineAcoustics={profile:CounterlineProfile;normalSpeeds:(number|null)[]};
export type CounterlineRecording={format:'rail-golf-counterline-recording';version:1;line:WorldcraftLine;acoustics:CounterlineAcoustics};
export const COUNTERLINE_RECORDINGS_KEY:string;
export function validateCounterlineProfile(value:unknown):CounterlineProfile;
export function validateCounterlineAcoustics(value:unknown,line:WorldcraftLine):CounterlineAcoustics;
export function captureCounterlineRecording(line:WorldcraftLine,resonance:{impacts?:ResonanceImpact[]},profile:CounterlineProfile):CounterlineRecording;
export function validateCounterlineRecording(value:unknown):CounterlineRecording;
export function counterlineVoicedImpact<T extends WorldcraftPerformanceImpact>(impact:T,profile:CounterlineProfile,normalSpeed:number|null|undefined):T&{sound?:SoundVariantId;strike?:number};
export function counterlineRecordedImpacts(line:WorldcraftLine,acoustics?:CounterlineAcoustics|null):Array<WorldcraftPerformanceImpact&{sound?:SoundVariantId;strike?:number}>;
export function counterlineRestoreProfile(line:WorldcraftLine,selectedAcoustics:CounterlineAcoustics|null|undefined,recordings?:CounterlineRecording[]):CounterlineProfile;
export function assertCounterlineRecordingIds(recordings:CounterlineRecording[]):boolean;
export function loadCounterlineRecordings(storage:Pick<Storage,'getItem'>|null):{recordings:CounterlineRecording[];warning:string;writable:boolean};
export function counterlineRecordingLabel(acoustics:CounterlineAcoustics|null):string;

export function validateCounterlinePhysicalLine(value:unknown):WorldcraftLine;
export function importCounterlineCaptures(value:unknown):{recordings:CounterlineRecording[];lines:WorldcraftLine[]};
