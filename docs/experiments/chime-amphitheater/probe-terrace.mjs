// Havok check for one curved step and the six-step bowl.
// Confirms facet contacts, shared-face seams, and that a tread is not first ground.
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger, NullEngine, Scene, Vector3, HavokPlugin } from '@babylonjs/core';
import { RAIL_RULES } from '../../../lib/rail-golf-v02.js';
import { validateWorld } from '../../../lib/worldcraft-model.js';
import { createWorldcraftRuntime } from '../../../lib/worldcraft-runtime.js';
import { worldcraftTerraceFacets } from '../../../lib/worldcraft-terrace.js';

Logger.LogLevels = 0;

function bowl(id, launcher) {
  const objects = [];
  for (let i = 0; i < 6; i += 1) {
    const elevation = (i + 1) * 0.5;
    objects.push({
      id: `step-${i}`, kind: 'terrace', x: 0, z: 32, yaw: -180,
      innerRadius: 8 + i * 2, depth: 2, riser: elevation, span: 216, elevation, gap: 24,
      voice: { material: 'timber', degree: i % 5 },
    });
  }
  return validateWorld({
    format: 'rail-golf-worldcraft', version: 1, id, name: id,
    environment: { preset: 'forest-clearing-v1', seed: 1 },
    launcher,
    objects,
    rules: { pin: null, locked: objects.map(object => object.id), allowance: {}, rail: null, goal: { kind: 'none' } },
  });
}

const wasm = await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });

function session(world) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const runtime = createWorldcraftRuntime(scene, { world, build: 'probe' });
  return { engine, scene, physics, runtime };
}

function play(world, aim) {
  const rig = session(world);
  const started = performance.now();
  rig.runtime.setDynamics('normal-speed');
  rig.runtime.setMode('play');
  if (!rig.runtime.launch({ railIndex: 1, originX: 0, ...aim })) throw new Error(rig.runtime.error);
  const buildMs = performance.now() - started;
  const raw = [];
  const body = rig.runtime.flight.aggregate.body;
  body.getCollisionObservable().add(event => {
    const other = event.collider === body ? event.collidedAgainst : event.collider;
    const node = other?.transformNode;
    const velocity = body.getLinearVelocity();
    const speed = velocity ? Math.hypot(velocity.x, velocity.y, velocity.z) : null;
    raw.push({
      name: node?.name ?? null,
      facet: node?.metadata?.facet ?? null,
      ny: Number.isFinite(event.normal?.y) ? event.normal.y : null,
      y: Number.isFinite(event.point?.y) ? event.point.y : null,
      speed,
    });
  });
  for (let step = 0; step < 7300 && !rig.runtime.flight.ended; step += 1) {
    rig.runtime.beforeStep();
    rig.physics._step(1 / 120);
    rig.runtime.afterStep();
  }
  const last = rig.runtime.last;
  const diagnostics = rig.runtime.diagnostics();
  const finite = raw.every(row => row.speed === null || Number.isFinite(row.speed));
  const fastest = raw.reduce((max, row) => Math.max(max, row.speed ?? 0), 0);
  const notes = (last.resonance?.impacts ?? []).filter(impact => impact.gain > 0).map(impact => impact.piece);
  const contacts = (last.contacts ?? []).map(row => row.body);
  rig.runtime.dispose();
  rig.scene.dispose();
  rig.engine.dispose();
  return { aim, reason: last.terminal?.reason, contacts, notes, raw: raw.length, facets: [...new Set(raw.map(row => row.facet).filter(value => value !== null))], fastest, finite, buildMs, diagnostics, sample: raw.slice(0, 8) };
}

const aisle = bowl('bowl-aisle', { x: 0 });
const stage = bowl('bowl-stage', { x: 0, z: 32, yaw: -180 });
console.log('facets per outer step', worldcraftTerraceFacets(aisle.objects[5]).length);
const aims = [
  { yaw: 0, elevation: 8, charge: 0.45 },
  { yaw: 0, elevation: 12, charge: 0.55 },
  { yaw: 8, elevation: 16, charge: 0.55 },
  { yaw: -10, elevation: 20, charge: 0.45 },
  { yaw: 14, elevation: 24, charge: 0.65 },
  { yaw: 0, elevation: 18, charge: 0.55 },
];
for (const aim of aims) {
  const shot = play(aisle, aim);
  console.log('aisle', JSON.stringify({ aim: shot.aim, reason: shot.reason, notes: shot.notes, contacts: shot.contacts, facets: shot.facets, fastest: Number(shot.fastest.toFixed(2)), finite: shot.finite, bodies: shot.diagnostics.staticBodies, buildMs: Number(shot.buildMs.toFixed(1)) }));
}
for (const aim of aims) {
  const shot = play(stage, aim);
  console.log('stage', JSON.stringify({ aim: shot.aim, reason: shot.reason, notes: shot.notes, contacts: shot.contacts, facets: shot.facets, fastest: Number(shot.fastest.toFixed(2)), finite: shot.finite }));
}
