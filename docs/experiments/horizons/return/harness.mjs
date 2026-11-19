import { Logger, NullEngine, Scene, HavokPlugin, Vector3 } from '@babylonjs/core';
import { RAIL_RULES } from '../../../../lib/rail-golf-v02.js';
import { createWorldcraftRuntime } from '../../../../lib/worldcraft-runtime.js';
import { adaptRangePreset } from '../../../../lib/worldcraft-range.js';

Logger.LogLevels = 0;
const xyz = vector => vector ? [vector.x, vector.y, vector.z] : null;

// Instrumentation only. The same runtime, collider callbacks and 120 Hz loop as
// the browser. Velocities bracket the solver step that emitted each callback.
export function createReturnHarness(havok, preset) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120); physics.setSubTimeStep(1000 / 120);
  const casters = new Set();
  const shadows = { addShadowCaster: mesh => casters.add(mesh), removeShadowCaster: mesh => casters.delete(mesh), getShadowMap: () => ({ renderList: [...casters] }) };
  const start = performance.now();
  const runtime = createWorldcraftRuntime(scene, { world: adaptRangePreset(preset).world, build: '6ebb2f2b370656c7e70b108ad04d0369b78cf89c', shadows });
  const buildMs = performance.now() - start;
  const diagnostics = () => ({ ...runtime.diagnostics(), sceneMeshes: scene.meshes.length, visibleMeshes: scene.meshes.filter(m => m.isVisible && m.getTotalVertices()).length, buildMs });
  return {
    runtime, scene, physics, diagnostics,
    shoot(setup) {
      runtime.setMode('build'); runtime.setMode('play');
      if (!runtime.launch(setup)) throw Error(runtime.error);
      const body = runtime.flight.aggregate.body, events = [];
      let before = null, step = 0;
      const token = body.getCollisionObservable().add(event => {
        const other = event.collider === body ? event.collidedAgainst : event.collider;
        events.push({ step, time: runtime.flight.elapsed, body: other.transformNode.name, point: xyz(event.point), normal: xyz(event.normal), incoming: before, outgoing: null });
      });
      for (step = 0; step < 7300 && !runtime.flight.ended; step++) {
        before = xyz(body.getLinearVelocity());
        runtime.beforeStep();
        const from = events.length;
        physics._step(1 / 120);
        const after = xyz(body.getLinearVelocity());
        for (const event of events.slice(from)) event.outgoing = after;
        runtime.afterStep();
      }
      body.getCollisionObservable().remove(token);
      const last = runtime.last;
      if (!last) throw Error('Unresolved shot');
      const episodes = [];
      for (const event of events) {
        const prior = episodes.at(-1);
        if (prior && prior.body === event.body && event.step <= prior.lastStep + 1) { prior.lastStep = event.step; prior.lastTime = event.time; prior.outgoing = event.outgoing; prior.callbacks++; }
        else episodes.push({ ...event, lastStep: event.step, lastTime: event.time, callbacks: 1, freeFlightSincePrior: event.time - (prior?.lastTime ?? 0) });
      }
      const result = { setup, launch: last.launch, terminal: last.terminal, ledger: last.contacts, episodes, samples: last.samples, goal: last.goalResult };
      runtime.setMode('build');
      return result;
    },
    replace(preset) { runtime.setMode('build'); return runtime.replaceWorld(adaptRangePreset(preset).world, { intent: 'load' }); },
    dispose() {
      const before = diagnostics(); runtime.dispose();
      const after = { physicsBodies: physics.getBodies().length, sceneMeshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length, shadowCasters: casters.size };
      scene.dispose(); engine.dispose(); return { before, after };
    },
  };
}
