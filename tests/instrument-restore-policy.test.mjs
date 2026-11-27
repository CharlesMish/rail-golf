import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {counterlineRestoreProfile,validateCounterlineRecording,counterlineRecordedImpacts} from '../lib/counterline-recording.js';
const captures=JSON.parse(await readFile(new URL('../public/refinement/counterline-examples.json',import.meta.url))).recordings.map(validateCounterlineRecording);
test('physical Restore respects explicit historical null over a captured copy of the same physical id',()=>{
 const record=captures[0],bytes=JSON.stringify(record);
 assert.equal(record.acoustics.profile.bankVoice,'tuned-even');
 assert.deepEqual(counterlineRestoreProfile(record.line,null,captures),{version:1,dynamics:'total-speed',bankVoice:null});
 assert.deepEqual(counterlineRestoreProfile(record.line,undefined,captures),record.acoustics.profile);
 assert.deepEqual(counterlineRestoreProfile(record.line,record.acoustics,[]),record.acoustics.profile);
 assert.deepEqual(counterlineRestoreProfile(record.line,undefined,[]),{version:1,dynamics:'total-speed',bankVoice:null});
 assert.equal(JSON.stringify(record),bytes);
 assert.deepEqual(counterlineRecordedImpacts(record.line,null),record.line.performance.impacts);
});
