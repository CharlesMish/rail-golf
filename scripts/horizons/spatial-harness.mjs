import { NullEngine, Scene, HavokPlugin, Vector3, Logger, PhysicsMotionType } from '@babylonjs/core';
import { RAIL_RULES } from '../../lib/rail-golf-v02.js';
import { createWorldcraftRuntime } from '../../lib/worldcraft-runtime.js';
import { adaptRangePreset } from '../../lib/worldcraft-range.js';
Logger.LogLevels = 0;

export function spatialHarness(havok, preset) {
  const engine = new NullEngine(), scene = new Scene(engine);
  scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
  const physics = scene.getPhysicsEngine();
  physics.setTimeStep(1 / 120);
  physics.setSubTimeStep(1000 / 120);
  const casters = [];
  const shadows = {
    addShadowCaster(mesh) { if (!casters.includes(mesh)) casters.push(mesh); },
    removeShadowCaster(mesh) { const index = casters.indexOf(mesh); if (index >= 0) casters.splice(index, 1); },
    getShadowMap() { return { renderList: casters }; },
  };
  const started = performance.now();
  const runtime = createWorldcraftRuntime(scene, { world: adaptRangePreset(preset).world, shadows, build: '0b151c5c94849b78ccda6c41a1755b66471e3fa2' });
  const constructMs = performance.now() - started;
  const resources = () => {
    const bodies = physics.getBodies();
    return {
      physicsBodies: bodies.length,
      staticBodies: bodies.filter(body => body.getMotionType() === PhysicsMotionType.STATIC).length,
      animatedBodies: bodies.filter(body => body.getMotionType() === PhysicsMotionType.ANIMATED).length,
      dynamicBodies: bodies.filter(body => body.getMotionType() === PhysicsMotionType.DYNAMIC).length,
      sceneMeshes: scene.meshes.length,
      heightGuides: scene.meshes.filter(mesh => Boolean(mesh.metadata?.worldcraftHeightGuide)).length,
      materials: scene.materials.length, textures: scene.textures.length,
      geometries: scene.geometries.length, transformNodes: scene.transformNodes.length,
      shadowCasters: casters.length,
    };
  };
  return {
    runtime, scene, engine, physics, constructMs, resources,
    load(next) {
      runtime.setMode('build');
      const start = performance.now();
      const result = runtime.replaceWorld(adaptRangePreset(next).world, { intent: 'load' });
      if (!result.ok) throw Error(result.error);
      return performance.now() - start;
    },
    shoot(setup, { points = false, sceneSteps = false } = {}) {
      runtime.setMode('build'); runtime.setMode('play');
      if (!runtime.launch(setup)) throw Error(runtime.error);
      const rawContacts = [], ticks = [];
      let incoming = null;
      const body = runtime.flight.aggregate.body;
      body.getCollisionObservable().add(event => {
        const other = event.collider === body ? event.collidedAgainst : event.collider;
        if (!event.point) return;
        rawContacts.push({
          tick: ticks.length, t: runtime.flight.elapsed, body: other.transformNode.name,
          point: event.point.asArray(), normal: event.normal?.asArray() ?? null,
          incoming: incoming?.slice() ?? null, outgoing: body.getLinearVelocity().asArray(),
        });
      });
      const activeResources = resources();
      const before = sceneSteps ? scene.onBeforePhysicsObservable.add(() => runtime.beforeStep()) : null;
      const after = sceneSteps ? scene.onAfterPhysicsObservable.add(() => runtime.afterStep()) : null;
      const started = performance.now();
      for (let tick = 0; tick < 7300 && !runtime.flight.ended; tick++) {
        incoming = body.getLinearVelocity().asArray();
        if (sceneSteps) scene._advancePhysicsEngineStep(1000 / 120);
        else { runtime.beforeStep(); physics._step(1 / 120); runtime.afterStep(); }
        ticks.push({ t: runtime.flight.elapsed, position: runtime.flight.mesh.position.asArray(), velocity: body.getLinearVelocity().asArray() });
      }
      if (before) scene.onBeforePhysicsObservable.remove(before);
      if (after) scene.onAfterPhysicsObservable.remove(after);
      const elapsedMs = performance.now() - started;
      const result = structuredClone(runtime.last);
      if (!result) throw Error('Shot did not resolve');
      runtime.setMode('build');
      return { setup, terminal: result.terminal, contacts: result.contacts,
        redirects: result.evidence.filter(event => event.kind === 'redirect'), rawContacts,
        activeResources, elapsedMs, ticks: points ? ticks : undefined,
        samples: points ? result.samples : undefined,
      };
    },
    disposeRuntime() { runtime.dispose(); return resources(); },
    dispose() { runtime.dispose(); scene.dispose(); engine.dispose(); },
  };
}
