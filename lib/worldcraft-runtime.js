import { RAIL_RULES, chargeToSpeed } from './rail-golf-v02.js';
import { createSpatialSession, spatialLaunch } from './spatial-lab-session.js';
import { validateWorld, validateWorldEdit, validateWorldcraftShot, worldcraftIdentity, worldcraftPinResult, worldcraftTargetResult } from './worldcraft-model.js';
import { buildWorldcraftScene, createWorldcraftMaterials, worldcraftMuzzleClearance, WORLDCRAFT_GROUND } from './worldcraft-scene.js';
import { createResonanceEar } from './worldcraft-resonance.js';

export const WORLDCRAFT_SAMPLE_LIMIT = 1024;
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const snapshot = value => freeze(structuredClone(value));
export const worldcraftWorldIdentity = worldcraftIdentity;

/** Build owns layout changes; Play delegates every physical step to the accepted session. */
export function createWorldcraftRuntime(scene, { world: initial, onEvent = () => {}, materials, shadows = null, build = '' } = {}) {
  let world = snapshot(validateWorld(initial));
  const ownedMaterials = materials ? null : createWorldcraftMaterials(scene);
  const palette = materials ?? ownedMaterials.materials;
  let compiled = null, session = null;
  let mode = 'build', disposed = false, last = null, error = '', revision = 0, rebuildCount = 0, rebuildMs = 0;
  let samples = [], sampleStride = 3, ticks = 0, launchSnapshot = null, firedWorld = null, generation = 0;
  const ear = createResonanceEar();
  const emit = event => { if (!disposed) onEvent(event); };
  const config = () => ({
    // originX is the stopped carriage position. World.launcher.x is only its saved default.
    station: setup => ({ id: 'worldcraft', label: 'Worldcraft apron', x: setup.originX, z: 0, yaw: 0 }),
    bounds: WORLDCRAFT_GROUND,
  });
  const sample = () => {
    const flight = session?.flight; if (!flight) return;
    const p = flight.mesh.position, point = { t: flight.elapsed, x: p.x, y: p.y, z: p.z };
    if (samples.at(-1)?.t === point.t) return;
    if (samples.length >= WORLDCRAFT_SAMPLE_LIMIT) { samples = samples.filter((_, i) => i % 2 === 0); sampleStride *= 2; }
    samples.push(point);
  };
  const createSession = (current, currentWorld) => {
    const ownGeneration = ++generation;
    const identity = worldcraftWorldIdentity(currentWorld);
    const adapter = {
      ...current,
      environment: { snapshot: () => ({ world: identity }), restore() {}, reset() {} },
      contact(other, _point, flight) {
        const velocity = flight?.aggregate?.body?.getLinearVelocity?.();
        const impact = ear.hear({
          body: other?.transformNode?.name ?? '',
          time: flight?.elapsed ?? 0,
          speed: velocity ? Math.hypot(velocity.x, velocity.y, velocity.z) : 0,
          world: currentWorld,
        });
        if (impact) emit({ kind: 'resonance', impact: { ...impact } });
        return null;
      },
    };
    return createSpatialSession(scene, adapter, config(), event => {
      if (disposed || ownGeneration !== generation) return;
      if (event.kind === 'end') {
        sample();
        last = snapshot({ ...event.last, world: firedWorld, worldIdentity: worldcraftWorldIdentity(firedWorld), launch: launchSnapshot,
          samples, terminal: { reason: event.last.reason, elapsed: event.last.elapsed, position: [...event.last.position] },
          pinResult: worldcraftPinResult(firedWorld,{reason:event.last.reason,position:event.last.position}),
          targetResult: worldcraftTargetResult(firedWorld,{reason:event.last.reason,contacts:event.last.contacts}),
          resonance: ear.snapshot(), build });
        emit({ ...event, last });
      } else emit(event);
    });
  };
  const compile = next => {
    const start = performance.now();
    const nextCompiled = buildWorldcraftScene(scene, next, { materials: palette, shadows });
    return { nextCompiled, ms: performance.now() - start };
  };
  try {
    const result = compile(world); compiled = result.nextCompiled; rebuildMs = result.ms; rebuildCount++;
    session = createSession(compiled, world);
  } catch (e) { compiled?.dispose(); ownedMaterials?.dispose(); throw e; }
  return {
    get world() { return world; }, get flight() { return session?.flight ?? null; }, get last() { return last; },
    get objectMeshes() { return compiled.objectMeshes; }, get mode() { return mode; }, get error() { return error; },
    setMode(next) {
      if (disposed || !['build','play'].includes(next)) return false;
      if (session.flight && !session.flight.ended) { error = 'Finish or stop the shot before changing mode.'; return false; }
      if (next === 'build') session.action('retry');
      mode = next; error = ''; return true;
    },
    launch(input) {
      if (disposed || mode !== 'play' || (session.flight && !session.flight.ended)) { error = 'Enter Play and finish the current shot before firing.'; return false; }
      let setup;
      try { setup = validateWorldcraftShot(world,input); } catch (e) { error = e.message; return false; }
      const launch = spatialLaunch(config(), setup), clearance = worldcraftMuzzleClearance(compiled, launch.muzzle);
      if (!clearance.ok) { error = clearance.reason; return false; }
      samples = []; sampleStride = 3; ticks = 0; firedWorld = world; ear.begin();
      launchSnapshot = snapshot({ ...launch, direction: launch.aim, speed: chargeToSpeed(setup.charge), mass: RAIL_RULES.projectileMass, radius: RAIL_RULES.projectileRadius });
      if (!session.fire(setup)) { error = 'The shot setup is invalid.'; return false; }
      sample(); error = ''; return true;
    },
    replaceWorld(input, { intent = 'edit' } = {}) {
      if (disposed || mode !== 'build' || session.flight) return { ok: false, error: 'Return to Build before editing the world.' };
      let next, result;
      const started = performance.now();
      try {
        if (!['edit','load'].includes(intent)) throw new Error('Unknown world replacement intent');
        next = snapshot(intent==='load'?validateWorld(input):validateWorldEdit(world,input)); result = compile(next);
      }
      catch (e) { error = e.message; return { ok: false, error }; }
      // No step can interleave this synchronous swap. Invalid proposals retain the current world.
      session.dispose(); compiled.dispose(); world = next; compiled = result.nextCompiled;
      session = createSession(compiled, world); last = null; samples = []; firedWorld = null; launchSnapshot = null;
      revision++; rebuildCount++; rebuildMs = performance.now() - started; error = '';
      return { ok: true };
    },
    clearShot() { if (disposed) return; session.action('retry'); samples = []; launchSnapshot = null; firedWorld = null; },
    beforeStep() { if (!disposed && mode === 'play') session.beforeStep(); },
    afterStep() { if (!disposed && mode === 'play') { session.afterStep(); if (session.flight && !session.flight.ended && ++ticks % sampleStride === 0) sample(); } },
    diagnostics() {
      return { mode, revision, worldIdentity: worldcraftWorldIdentity(world), objectCount: world.objects.length,
        staticBodies: compiled.bodies.length, liveBodies: session?.flight ? 1 : 0, meshes: compiled.meshes.length,
        materials: scene.materials.length, textures: scene.textures.length, physicsBodies: scene.getPhysicsEngine()?.getBodies().length ?? 0,
        shadowCasters: shadows?.getShadowMap()?.renderList?.length ?? 0, rebuildCount, rebuildMs, samples: samples.length,
        live: Boolean(session?.flight && !session.flight.ended), disposed, error };
    },
    dispose() { if (disposed) return; disposed = true; generation++; session.dispose(); compiled.dispose(); ownedMaterials?.dispose(); },
  };
}
