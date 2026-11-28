import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {exhibitionInstruments} from '../lib/instrument-exhibition.js';
import {registeredInstruments} from '../lib/instrument-catalog.js';
import {appendInstrument,instrumentReferences,instrumentWorld} from '../lib/instrument-foundry.js';
import {adaptRangePreset,rangeOpeningSetup} from '../lib/worldcraft-range.js';
import {worldcraftIdentity} from '../lib/worldcraft-model.js';
import {validateInstrumentProbes} from '../scripts/instrument-foundry/validate.mjs';

const submissions=[
 ['exchange','dde55e0db19af9844664b6b3b8f29e2e1da7743ee882a635f7eb6c9e158cc4fb','eaea9cf4efd7975ab0e7b8302179ee74dd55bd686f0a1e4cd47247f5f86f6863',9],
 ['hairpin-fable-v1','de676687df6375a0dac8de413ec34180a27ef230b91cbfdb20d71317702b4355','f8896921b622238464156ae0d8b11777df66f1d3fc64c815b5afbaed21565f14',19],
 ['antiphonal-arc-v1','65b5a447711b72ef995c97bb05bc78155f1398027c8744661cb576982a6b0e4b','8c9b5a7a4c5164b31522b07d716f63f6ac70333efd223572f11afe95e06e4812',9],
];

test('exhibition admits the byte-exact original instruments and probes with their declared source and openings',async()=>{
 const catalog=exhibitionInstruments();
 for(const [id,instrumentHash,probeHash,count] of submissions){
  const base=new URL(`../worlds/instruments/exhibition/${id}/`,import.meta.url);
  const raw=await readFile(new URL('instrument.json',base)),probeRaw=await readFile(new URL('probes.json',base));
  assert.equal(createHash('sha256').update(raw).digest('hex'),instrumentHash);
  assert.equal(createHash('sha256').update(probeRaw).digest('hex'),probeHash);
  const author=JSON.parse(raw),accepted=catalog.find(i=>i.preset.id===id),world=instrumentWorld(accepted);
  assert.deepEqual(accepted,author);
  assert.equal(accepted.sourceBuild,'3c67ceb9de1739c23092f6fdd8680b9047536a9f');
  assert.deepEqual(world.opening,author.opening);assert.deepEqual(world.originalOpening,rangeOpeningSetup(author.preset));
  assert.deepEqual(world.profile,author.profile);assert.equal(world.invitation,author.invitation);
  assert.equal(worldcraftIdentity(world.world),worldcraftIdentity(adaptRangePreset(author.preset).world));
  assert.equal(validateInstrumentProbes(accepted,JSON.parse(probeRaw)).cases.length,count);
 }
});

test('exhibition catalog is temporary and leaves references and ordinary Foundry registration intact',()=>{
 const ordinary=registeredInstruments(),references=instrumentReferences(),catalog=exhibitionInstruments();
 assert.deepEqual(catalog.slice(0,2),references);
 assert.deepEqual(catalog.map(i=>i.preset.id),['descending-resonance','chime-terraces',...submissions.map(s=>s[0])]);
 assert.deepEqual(ordinary,references);assert.deepEqual(registeredInstruments(),ordinary);
 catalog.pop();assert.equal(exhibitionInstruments().length,5);assert.equal(registeredInstruments().length,2);
});

test('three exhibition submissions share the existing six-slot bound with visit imports',()=>{
 let catalog=exhibitionInstruments();
 assert.equal(appendInstrument(catalog,catalog[2]).length,5);
 for(let i=0;i<3;i++){const extra=structuredClone(catalog[2]);extra.preset.id=`exhibition-visitor-${i}`;catalog=appendInstrument(catalog,extra);}
 assert.equal(catalog.length,8);
 const overflow=structuredClone(catalog[2]);overflow.preset.id='exhibition-visitor-overflow';
 assert.throws(()=>appendInstrument(catalog,overflow),/six additional/);
 assert.deepEqual(registeredInstruments(),instrumentReferences());
});
