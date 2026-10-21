'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera, Color3, Color4, DirectionalLight, Engine, FreeCamera, HavokPlugin,
  HemisphericLight, LinesMesh, Matrix, Mesh, MeshBuilder, Plane, Scene,
  ShadowGenerator, Vector3,
} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { BUILD_ID } from '@/lib/build-identity';
import { RAIL_RULES, clamp } from '@/lib/rail-golf-v02';
import { rangeDrag, rangeSetup } from '@/lib/mechanism-range-controls';
import { launchCharge } from '@/lib/shot-tools';
import { buildRangeLauncher, buildRangeProjectile } from '@/lib/mechanism-range-presentation';
import { advanceFlightCamera, followHeading, followOffsets } from '@/lib/flight-framing';
import { createWorldcraftRuntime, type WorldcraftRecord } from '@/lib/worldcraft-runtime';
import { createWorldcraftPresentation, WORLDCRAFT_PRESENTATION } from '@/lib/worldcraft-presentation';
import { worldcraftTrailDashes } from '@/lib/worldcraft-trails';
import {
  createStarterWorld, createHouseShotWorld, createTwoPiecePitchWorld, createWorldHistory, createWorldcraftStore, validateWorld,
  worldcraftFixedSetup, worldcraftSetupForWorld, worldcraftCanAdd,
  worldcraftIdentity, parseWorldJSON, exportWorldJSON, captureWorldSnapshot,
  packWorldcraftLine, WORLDCRAFT_CATALOG, WORLDCRAFT_RAMP_PITCH,
  type WorldcraftDocument as WorldcraftWorld, type WorldcraftSetup,
} from '@/lib/worldcraft-model';
import styles from './worldcraft.module.css';

type Kind = 'bank' | 'ramp' | 'block';
type Phase = 'loading' | 'ready' | 'charging' | 'flight' | 'result' | 'error';
type Store = ReturnType<typeof createWorldcraftStore>;
type RecordedTrail = { label: string; worldIdentity: string; setup: WorldcraftSetup; points: { x: number; y: number; z: number }[] };
type UI = {
  mode: 'build' | 'play'; phase: Phase; view: 'address' | 'survey';
  world: WorldcraftWorld; selected: string | null; setup: WorldcraftSetup;
  powerMode: 'hold' | 'set'; charge: number; last: WorldcraftRecord | null;
  notice: string; canUndo: boolean; canRedo: boolean; revision: number;
  memoryOpen: boolean; worlds: ReturnType<Store['worlds']>; lines: ReturnType<Store['lines']>;
  memoryWarning: string; showTrail: boolean; cameraTool: 'orbit' | 'pan';
  history: RecordedTrail | null; comparison: RecordedTrail | null;
  lastKept: boolean;
};
type Actions = {
  mode(mode: UI['mode']): void; select(id: string): void; add(kind: Kind): void;
  change(patch: Partial<{ x: number; z: number; yaw: number; pitch: number }>): void;
  remove(): void; undo(): void; redo(): void; setup(patch: Partial<WorldcraftSetup>): void;
  powerMode(mode: UI['powerMode']): void; begin(): void; release(): void; cancel(): void;
  ready(): void; adjust(): void; survey(): void; trail(): void; keep(): void;
  memory(open: boolean): void; save(): void; load(id: string): void; forgetWorld(id: string): void;
  restoreLine(id: string): void; forgetLine(id: string): void; export(): void; exportMemory(): void; import(text: string): void;
  rename(name: string): void; starter(empty?: boolean): void; house(): void; pitchChallenge(): void;
  camera(action: 'left' | 'right' | 'in' | 'out' | 'home' | 'focus' | 'tool'): void;
};

function initialUI(): UI {
  const world = createHouseShotWorld();
  return {
    mode: 'build', phase: 'loading', view: 'survey', world, selected: world.objects[0]?.id ?? null,
    setup: worldcraftFixedSetup(world)!,
    powerMode: 'set', charge: 0, last: null, notice: 'Loading the physical yard…',
    canUndo: false, canRedo: false, revision: 0, memoryOpen: false, worlds: [], lines: [],
    memoryWarning: '', showTrail: true, cameraTool: 'orbit', history: null, comparison: null, lastKept: false,
  };
}

export default function Worldcraft() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const actions = useRef<Actions | null>(null);
  const [ui, setUI] = useState<UI>(initialUI);
  const uiRef = useRef(ui);
  const upload = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const toolsPanel = useRef<HTMLElement>(null);

  useEffect(() => { if (toolsPanel.current) toolsPanel.current.scrollTop = 0; }, [ui.mode]);

  useEffect(() => {
    if (!ui.memoryOpen || !dialog.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const focusables = () => [...element.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([type=file]):not(:disabled),select:not(:disabled),a[href]')];
    focusables()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const nodes = focusables(), first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    element.addEventListener('keydown', trap);
    return () => { element.removeEventListener('keydown', trap); previous?.focus(); };
  }, [ui.memoryOpen]);

  useEffect(() => {
    let disposed = false;
    let engine: Engine | null = null, scene: Scene | null = null;
    let cleanup = () => {};
    const publish = (patch: Partial<UI>) => {
      if (disposed) return;
      uiRef.current = { ...uiRef.current, ...patch };
      setUI(uiRef.current);
    };
    const boot = async () => {
      try {
        const havok = await HavokPhysics();
        if (disposed) return;
        const surface = canvas.current!;
        engine = new Engine(surface, true, { preserveDrawingBuffer: true, stencil: true });
        engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
        scene = new Scene(engine);
        const activeScene = scene, activeEngine = engine;
        scene.clearColor = new Color4(.045, .075, .085, 1);
        scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = 125; scene.fogEnd = 300;
        scene.fogColor = new Color3(.08, .12, .13);
        scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
        scene.getPhysicsEngine()!.setTimeStep(1 / 120);
        scene.getPhysicsEngine()!.setSubTimeStep(1000 / 120);
        const camera = new FreeCamera('worldcraft-camera', new Vector3(60, 80, -30), scene);
        camera.inputs.clear(); camera.minZ = .1; camera.maxZ = WORLDCRAFT_PRESENTATION.cameraFar;
        const look = new Vector3(0, 1, 42);
        const sky = new HemisphericLight('worldcraft-sky', new Vector3(0, 1, 0), scene);
        sky.intensity = .92; sky.groundColor = new Color3(.20, .15, .10);
        const sun = new DirectionalLight('worldcraft-sun', new Vector3(-.45, -1, .35), scene);
        sun.position.set(35, 70, -35); sun.intensity = 1.3; sun.diffuse = new Color3(1, .85, .66);
        const shadows = new ShadowGenerator(1024, sun);
        shadows.usePercentageCloserFiltering = true; shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
        shadows.bias = .001; shadows.normalBias = .03;
        const presentation = createWorldcraftPresentation(scene);
        let projectile: ReturnType<typeof buildRangeProjectile> | null = null;
        let comparisonTrail: LinesMesh | null = null;
        let trail: LinesMesh | null = null, spine: LinesMesh | null = null;
        let flightPoints: Vector3[] = [], trailTick = 0, previous: Vector3 | null = null;
        let heading = { x: 0, y: 0, z: 1 };
        let chargeStart = 0, lastChargeUpdate = 0, keyboardCharge = false;
        const events: Record<string, unknown>[] = [];
        const trace = (kind: string, data: Record<string, unknown> = {}) => {
          events.push({ kind, at: performance.now(), revision: uiRef.current.revision, ...data });
          if (events.length > 500) events.shift();
        };
        const history = createWorldHistory(uiRef.current.world);
        let storage: Storage | null = null;
        try { storage = window.localStorage; } catch { /* Memory-only store reports this below. */ }
        const store = createWorldcraftStore(storage ?? { getItem() { throw new Error('Browser storage is unavailable.'); }, setItem() { throw new Error('Browser storage is unavailable.'); } });
        const kept = new WeakMap<WorldcraftRecord, ReturnType<typeof packWorldcraftLine>>();
        const memoryState = () => ({ worlds: store.worlds(), lines: store.lines(), memoryWarning: store.status().warning ?? '' });
        const drawTrail = (points: { x: number; y: number; z: number }[]) => {
          trail?.dispose(); trail = null;
          if (points.length < 2 || !uiRef.current.showTrail) return;
          trail = MeshBuilder.CreateLines('worldcraft-actual-line', { points: points.map(p => new Vector3(p.x, p.y, p.z)) }, activeScene);
          trail.color = new Color3(.2, .83, .84); trail.isPickable = false;
        };
        const drawComparison = () => {
          comparisonTrail?.dispose(); comparisonTrail = null;
          const record = uiRef.current.comparison;
          if (!record || record.points.length < 2 || !uiRef.current.showTrail) return;
          comparisonTrail = MeshBuilder.CreateLineSystem('worldcraft-before-line', { lines: worldcraftTrailDashes(record.points).map(line=>line.map(p=>new Vector3(p.x,p.y,p.z))) }, activeScene);
          comparisonTrail.color = new Color3(1,.66,.28); comparisonTrail.isPickable = false;
        };
        const runtime = createWorldcraftRuntime(scene, {
          world: uiRef.current.world, materials: presentation.materials, shadows, build: BUILD_ID,
          onEvent(event) {
            if (event.kind === 'end' && event.last) {
              const last = event.last;
              drawTrail(last.samples);
              publish({ phase: 'result', last, lastKept: false, history: { label: 'Latest line', worldIdentity: last.worldIdentity, setup: last.setup, points: last.samples }, notice: last.pinResult?.status === 'clear' ? `Pin cleared · first kiss ${last.pinResult.distance!.toFixed(1)} m from centre.` : last.pinResult?.status === 'miss' ? `First kiss ${last.pinResult.distance!.toFixed(1)} m from pin centre. ${uiRef.current.world.rules?.rampPitch ? 'Revise the ramp, its pitch, or the bank and compare.' : 'Revise the piece and compare.'}` : last.reason === 'first-ground-contact' ? 'First ground contact. Revise the shot or the space.' : `Line ended: ${last.reason.replaceAll('-', ' ')}. No clear.` });
              trace('resolved', { worldIdentity: last.worldIdentity, setup: last.setup, terminal: last.terminal, contacts: last.contacts, evidence: last.evidence });
            }
          },
        });
        const { launcher, yaw, loft } = buildRangeLauncher(scene, presentation.materials, shadows);
        const orbit = { angle: .5, elevation: .70, radius: 112, x: 0, z: 43 };
        let drag: null | {
          id: number; x: number; y: number; startX: number; startY: number;
          type: 'object' | 'view' | 'aim'; ground?: Vector3; object?: WorldcraftWorld['objects'][number];
          preview?: Mesh; original?: Mesh; moved: boolean;
        } = null;
        const selectedHighlight = () => {
          for (const [id, mesh] of runtime.objectMeshes) mesh.showBoundingBox = uiRef.current.mode === 'build' && id === uiRef.current.selected;
        };
        const discardDrag = () => {
          if (!drag) return;
          if (drag.original) drag.original.isVisible = true;
          drag.preview?.dispose();
          if (surface.hasPointerCapture(drag.id)) surface.releasePointerCapture(drag.id);
          drag = null;
        };
        const busy = () => ['loading', 'error', 'flight', 'charging'].includes(uiRef.current.phase);
        const clearRound = () => {
          projectile?.dispose(); projectile = null; runtime.clearShot(); previous = null; flightPoints = [];
        };
        const commit = (world: WorldcraftWorld, label: string, historyAction: 'commit' | 'undo' | 'redo' = 'commit', load = false) => {
          if (uiRef.current.mode !== 'build' || busy()) return false;
          discardDrag();
          try {
            const candidate = validateWorld(world);
            const result = runtime.replaceWorld(candidate, { intent: load || historyAction !== 'commit' ? 'load' : 'edit' });
            if (!result.ok) throw new Error(result.error);
            if (historyAction === 'commit') history.commit(candidate);
            const selected = candidate.objects.some(o => o.id === uiRef.current.selected) ? uiRef.current.selected : candidate.objects[0]?.id ?? null;
            publish({ world: candidate, selected, setup: worldcraftSetupForWorld(candidate,uiRef.current.setup,{load}), ...(worldcraftFixedSetup(candidate) ? { powerMode: 'set' as const } : {}), ...history.status(), notice: label });
            selectedHighlight();
            if (uiRef.current.history) drawTrail(uiRef.current.history.points);
            trace('edit', { action: label, worldIdentity: worldcraftIdentity(candidate), objects: candidate.objects });
            return true;
          } catch (e) { publish({ notice: e instanceof Error ? e.message : String(e) }); return false; }
        };
        const switchMode = (mode: UI['mode']) => {
          if (busy()) return;
          discardDrag();
          projectile?.dispose(); projectile = null;
          if (!runtime.setMode(mode)) { publish({ notice: runtime.error }); return; }
          if (mode === 'play') runtime.clearShot();
          publish({ mode, phase: 'ready', view: mode === 'build' ? 'survey' : 'address', notice: mode === 'build' ? (uiRef.current.world.rules?.rampPitch ? 'Revise the ramp, its pitch, or the bank, then try the same shot.' : 'Move a piece, then try the same shot.') : uiRef.current.world.rules ? 'First kiss inside the gold circle clears the pin.' : 'No target or score. First ground contact ends the line.' });
          selectedHighlight(); trace('mode', { mode });
        };
        const updateSetup = (patch: Partial<WorldcraftSetup>) => {
          const state = uiRef.current;
          if (state.mode !== 'play' || !['ready', 'result'].includes(state.phase) || worldcraftFixedSetup(state.world)) return;
          if (state.phase === 'result') { clearRound(); publish({ phase: 'ready', view: 'address' }); }
          const next = { ...rangeSetup(state.setup, patch), originX: patch.originX === undefined ? state.setup.originX : Math.round(clamp(patch.originX, -10, 10) * 2) / 2, railIndex: 1 } as WorldcraftSetup;
          publish({ setup: next, notice: 'Ready in the current world.' });
          trace('setup', { setup: next });
        };
        const shoot = (charge: number) => {
          if (uiRef.current.mode !== 'play' || !['ready', 'charging'].includes(uiRef.current.phase)) return;
          const setup = { ...uiRef.current.setup, charge };
          if (!runtime.launch(setup)) { publish({ phase: 'ready', notice: runtime.error }); return; }
          projectile?.dispose(); projectile = buildRangeProjectile(activeScene, runtime.flight!.mesh, presentation.materials, shadows);
          projectile.sync(runtime.flight!.aggregate.body.getLinearVelocity());
          previous = null; heading = { x: Math.sin(setup.yaw * Math.PI / 180), y: 0, z: Math.cos(setup.yaw * Math.PI / 180) };
          flightPoints = []; trailTick = 0; trail?.dispose(); trail = null;
          publish({ phase: 'flight', setup, charge, comparison: uiRef.current.history, notice: 'Committed line · edits are locked.' });
          drawComparison();
          trace('fire', { setup, worldIdentity: worldcraftIdentity(uiRef.current.world), world: uiRef.current.world });
        };
        const cancel = () => { if (uiRef.current.phase === 'charging') publish({ phase: 'ready', charge: 0, notice: 'Charge cancelled.' }); keyboardCharge = false; };
        const restore = (world: WorldcraftWorld, setup: WorldcraftSetup, label: string) => {
          if (busy()) return;
          clearRound(); runtime.setMode('build'); publish({ mode: 'build', phase: 'ready' });
          if (!commit(world, label, 'commit', true)) return;
          runtime.setMode('play');
          publish({ mode: 'play', phase: 'ready', view: 'address', setup: { ...setup }, powerMode: 'set', charge: 0, comparison: null, notice: label });
          drawComparison();
          selectedHighlight(); trace('restore', { setup, worldIdentity: worldcraftIdentity(world) });
        };
        const download = (name: string, text: string) => {
          const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
          const a = document.createElement('a'); a.href = url; a.download = name; a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
        actions.current = {
          mode: switchMode,
          select(id) { if (uiRef.current.mode !== 'build' || busy()) return; publish({ selected: id }); selectedHighlight(); trace('select', { id }); },
          add(kind) {
            if (uiRef.current.mode !== 'build' || busy()) return;
            const world = uiRef.current.world;
            if (!worldcraftCanAdd(world, kind)) { publish({ notice: 'This world has no allowance for another piece of that kind.' }); return; }
            const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
            for (let z = 18; z <= 88; z += 12) for (const x of [0, -16, 16]) {
              const piece = { id, kind, x, z, yaw: 0, ...(kind === 'ramp' && world.rules?.rampPitch ? { pitch: -20 } : {}) };
              const next = { ...world, objects: [...world.objects, piece] };
              try { validateWorld(next); } catch { continue; }
              if (commit(next, `${kind[0].toUpperCase() + kind.slice(1)} added. Drag it or use the fine controls.`)) { publish({ selected: id }); selectedHighlight(); }
              return;
            }
            publish({ notice: 'No clear starting space. Move or remove a piece first.' });
          },
          change(patch) {
            const state = uiRef.current, object = state.world.objects.find(o => o.id === state.selected);
            if (!object || state.world.rules?.locked.includes(object.id)) return;
            const next = { ...object, ...patch };
            if (patch.yaw !== undefined) next.yaw = ((patch.yaw + 180) % 360 + 360) % 360 - 180;
            commit({ ...state.world, objects: state.world.objects.map(o => o.id === object.id ? next : o) }, `${object.kind} moved · same launch setup retained.`);
          },
          remove() {
            const state = uiRef.current;
            commit({ ...state.world, objects: state.world.objects.filter(o => o.id !== state.selected) }, 'Piece removed. Undo can bring it back.');
          },
          undo() { if (busy() || uiRef.current.mode !== 'build' || !history.status().canUndo) return; commit(history.undo(), 'Undid the last world edit.', 'undo'); },
          redo() { if (busy() || uiRef.current.mode !== 'build' || !history.status().canRedo) return; commit(history.redo(), 'Redid the world edit.', 'redo'); },
          setup: updateSetup,
          powerMode(mode) { if (busy() || worldcraftFixedSetup(uiRef.current.world)) return; publish({ powerMode: mode, charge: 0 }); },
          begin() {
            if (uiRef.current.mode !== 'play' || uiRef.current.phase !== 'ready' || uiRef.current.memoryOpen) return;
            if (uiRef.current.powerMode === 'set') { shoot(uiRef.current.setup.charge); return; }
            chargeStart = performance.now(); publish({ phase: 'charging', charge: 0 });
          },
          release() { if (uiRef.current.phase === 'charging') shoot(launchCharge('hold', uiRef.current.setup.charge, performance.now() - chargeStart)); },
          cancel,
          ready() {
            if (uiRef.current.phase === 'loading' || uiRef.current.phase === 'error') return;
            cancel(); clearRound(); publish({ phase: 'ready', view: 'address', notice: 'Ready · same setup, current world.' });
            if (uiRef.current.history) drawTrail(uiRef.current.history.points);
            trace('ready-current');
          },
          adjust() {
            const last = uiRef.current.last;
            if (last) {
              restore(last.world, last.setup as WorldcraftSetup, 'Last line restored: its starting world, origin, aim and power. Fire when ready.');
              publish({ history: { label: 'Latest line', worldIdentity: last.worldIdentity, setup: last.setup, points: last.samples } }); drawTrail(last.samples);
            }
          },
          survey() { if (busy() || uiRef.current.mode !== 'play') return; const address = uiRef.current.view === 'survey'; publish({ view: address ? 'address' : 'survey' }); if (address && uiRef.current.phase === 'result') { clearRound(); publish({ phase: 'ready', notice: 'Ready · same setup, current world.' }); } },
          trail() { publish({ showTrail: !uiRef.current.showTrail }); drawTrail(uiRef.current.phase === 'flight' ? flightPoints : uiRef.current.history?.points ?? []); drawComparison(); },
          keep() {
            const last = uiRef.current.last;
            if (!last || last.reason === 'interrupted' || busy()) return;
            try {
              const line = kept.get(last) ?? packWorldcraftLine({ worldSnapshot: captureWorldSnapshot(last.world, last.build), setup: last.setup as WorldcraftSetup, points: last.samples, events: last.evidence, terminal: last.terminal, launch: last.launch, contacts: last.contacts });
              const result = store.keepLine(line); kept.set(last, line);
              publish({ ...memoryState(), lastKept: true, notice: result.persisted ? 'Line kept with its exact starting world.' : 'Line kept only in memory. Export local memory before leaving.' }); trace('keep', { worldIdentity: last.worldIdentity, persisted: result.persisted });
            } catch (e) { publish({ notice: e instanceof Error ? e.message : String(e) }); }
          },
          memory(open) { if (open && busy()) return; publish({ memoryOpen: open, ...memoryState() }); },
          save() {
            try {
              const world = { ...uiRef.current.world, id: `world-${crypto.randomUUID().slice(0, 8)}`, launcher: { x: uiRef.current.setup.originX } };
              const result = store.saveWorld(world); publish({ ...memoryState(), notice: result.persisted ? 'New world copy saved locally.' : 'World saved only in memory. Export it before leaving.' }); trace('save-world', { id: world.id, persisted: result.persisted });
            } catch (e) { publish({ notice: e instanceof Error ? e.message : String(e) }); }
          },
          load(id) {
            const entry = store.worlds().find(w => w.id === id); if (!entry || busy()) return;
            clearRound(); runtime.setMode('build'); publish({ mode: 'build', phase: 'ready', view: 'survey' });
            if (commit(entry.world, 'Saved world opened. Your previous arrangement is in Undo.', 'commit', true)) publish({ setup: { ...uiRef.current.setup, originX: entry.world.launcher.x }, memoryOpen: false });
            trace('load-world', { id });
          },
          forgetWorld(id) { store.removeWorld(id); publish(memoryState()); },
          restoreLine(id) {
            const entry = store.lines().find(l => l.id === id); if (!entry) return;
            restore(entry.worldSnapshot.world, entry.setup, entry.worldSnapshot.build === BUILD_ID ? 'Kept world and launch setup restored. Fire manually.' : 'Kept setup restored from another build. A new physical shot may differ.');
            publish({ memoryOpen: false, history: { label: 'Kept line', worldIdentity: entry.worldSnapshot.worldIdentity, setup: entry.setup, points: entry.points } }); drawTrail(entry.points);
          },
          forgetLine(id) { store.removeLine(id); publish({ ...memoryState(), lastKept: uiRef.current.last && kept.get(uiRef.current.last)?.id === id ? false : uiRef.current.lastKept }); },
          export() { download('rail-golf-world.json', exportWorldJSON({ ...uiRef.current.world, launcher: { x: uiRef.current.setup.originX } })); trace('export-world'); },
          exportMemory() { download('rail-golf-worldcraft-memory.json', store.exportLocal()); trace('export-memory'); },
          import(text) {
            if (busy()) return;
            try {
              const world = parseWorldJSON(text);
              clearRound(); runtime.setMode('build'); publish({ mode: 'build', phase: 'ready', view: 'survey' });
              if (commit(world, 'Imported world opened. Undo returns to your previous arrangement.', 'commit', true)) publish({ setup: { ...uiRef.current.setup, originX: world.launcher.x }, memoryOpen: false });
              trace('import-world', { worldIdentity: worldcraftIdentity(world) });
            } catch (e) { publish({ notice: `Import rejected: ${e instanceof Error ? e.message : String(e)}` }); trace('import-rejected'); }
          },
          rename(name) {
            if (busy() || name === uiRef.current.world.name) return;
            try { validateWorld({ ...uiRef.current.world, name }); } catch (e) { publish({ notice: e instanceof Error ? e.message : String(e) }); return; }
            clearRound(); runtime.setMode('build'); publish({ mode: 'build', phase: 'ready', view: 'survey' });
            commit({ ...uiRef.current.world, name }, 'World renamed.');
          },
          starter(empty = false) {
            if (busy()) return;
            const world = createStarterWorld(); if (empty) { world.objects = []; world.name = 'An open clearing'; }
            clearRound(); runtime.setMode('build'); publish({ mode: 'build', phase: 'ready', view: 'survey' });
            commit(world, empty ? 'Empty clearing. Add a piece to begin.' : 'Starter arrangement opened. Undo preserves your previous world.', 'commit', true);
            publish({ memoryOpen: false, setup: { ...uiRef.current.setup, originX: world.launcher.x } });
          },
          house() {
            if (busy()) return;
            clearRound(); runtime.setMode('build'); publish({ mode: 'build', phase: 'ready', view: 'survey' });
            if (commit(createHouseShotWorld(), 'House Shot reset. Fire, turn the ramp, then compare.', 'commit', true)) {
              publish({ memoryOpen: false, history: null, comparison: null, last: null, lastKept: false });
              drawTrail([]); drawComparison();
            }
          },
          pitchChallenge() {
            if (busy()) return;
            clearRound(); runtime.setMode('build'); publish({ mode: 'build', phase: 'ready', view: 'survey' });
            if (commit(createTwoPiecePitchWorld(), 'Two-piece pitch. The open shot misses the gold circle. Revise the ramp, its incline, and the bank.', 'commit', true)) {
              publish({ memoryOpen: false, history: null, comparison: null, last: null, lastKept: false });
              drawTrail([]); drawComparison();
            }
          },
          camera(action) {
            if (uiRef.current.mode !== 'build' && uiRef.current.view !== 'survey') return;
            if (action === 'home') Object.assign(orbit, { angle: .5, elevation: .70, radius: 112, x: 0, z: 43 });
            if (action === 'focus') { const part = uiRef.current.world.objects.find(o => o.id === uiRef.current.selected); if (part) Object.assign(orbit, { x: part.x, z: part.z, radius: 45, elevation: .78 }); }
            if (action === 'left') orbit.angle -= .2; if (action === 'right') orbit.angle += .2;
            if (action === 'in') orbit.radius = Math.max(40, orbit.radius * .85); if (action === 'out') orbit.radius = Math.min(180, orbit.radius / .85);
            if (action === 'tool') publish({ cameraTool: uiRef.current.cameraTool === 'orbit' ? 'pan' : 'orbit' });
          },
        };
        const groundPoint = (e: PointerEvent) => {
          const rect = surface.getBoundingClientRect();
          const ray = activeScene.createPickingRay(e.clientX - rect.left, e.clientY - rect.top, Matrix.Identity(), camera);
          const distance = ray.intersectsPlane(new Plane(0, 1, 0, 0));
          return distance === null ? null : ray.origin.add(ray.direction.scale(distance));
        };
        const down = (e: PointerEvent) => {
          if (busy() || uiRef.current.memoryOpen || drag || e.button !== 0 && e.pointerType === 'mouse') return;
          const state = uiRef.current; e.preventDefault();
          let object: WorldcraftWorld['objects'][number] | undefined, original: Mesh | undefined;
          if (state.mode === 'build') {
            const rect = surface.getBoundingClientRect();
            const pick = activeScene.pick(e.clientX - rect.left, e.clientY - rect.top, mesh => Boolean(mesh.metadata?.worldcraftId));
            object = state.world.objects.find(o => o.id === pick?.pickedMesh?.metadata?.worldcraftId);
            if (object) { actions.current!.select(object.id); if (state.world.rules?.locked.includes(object.id)) return; original = runtime.objectMeshes.get(object.id); }
          }
          drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, type: object ? 'object' : state.mode === 'build' || state.view === 'survey' ? 'view' : 'aim', ground: groundPoint(e) ?? undefined, object, original, moved: false };
          surface.setPointerCapture(e.pointerId);
        };
        const move = (e: PointerEvent) => {
          if (!drag || drag.id !== e.pointerId) return;
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5) drag.moved = true;
          if (drag.type === 'object' && drag.object && drag.ground && drag.moved) {
            const point = groundPoint(e); if (!point) return;
            if (!drag.preview) {
              const prefab = WORLDCRAFT_CATALOG[drag.object.kind];
              drag.preview = MeshBuilder.CreateBox('worldcraft-drag-preview', { width: prefab.width, height: prefab.height, depth: prefab.depth }, activeScene);
              drag.preview.position.copyFrom(drag.original!.position); drag.preview.rotation.copyFrom(drag.original!.rotation);
              drag.preview.rotationQuaternion = drag.original!.rotationQuaternion?.clone() ?? null;
              drag.preview.material = drag.original!.material; drag.preview.visibility = .65; drag.preview.isPickable = false;
              drag.original!.isVisible = false;
            }
            drag.preview.position.x = Math.round(drag.object.x + point.x - drag.ground.x);
            drag.preview.position.z = Math.round(drag.object.z + point.z - drag.ground.z);
          } else if (drag.type === 'view') {
            if (uiRef.current.cameraTool === 'pan' || e.shiftKey) {
              orbit.x = clamp(orbit.x - dx * .10 * Math.cos(orbit.angle) - dy * .10 * Math.sin(orbit.angle), -30, 30);
              orbit.z = clamp(orbit.z + dx * .10 * Math.sin(orbit.angle) - dy * .10 * Math.cos(orbit.angle), 0, 100);
            } else { orbit.angle -= dx * .006; orbit.elevation = clamp(orbit.elevation + dy * .004, .3, 1.38); }
          } else if (drag.type === 'aim') { const next = rangeDrag(uiRef.current.setup, dx, dy, e.pointerType); updateSetup({ yaw: next.yaw, elevation: next.elevation }); }
          drag.x = e.clientX; drag.y = e.clientY;
        };
        const up = (e: PointerEvent) => {
          if (!drag || drag.id !== e.pointerId) return;
          const patch = drag.preview ? { x: drag.preview.position.x, z: drag.preview.position.z } : null;
          discardDrag(); if (patch) actions.current?.change(patch);
        };
        const wheel = (e: WheelEvent) => {
          if (uiRef.current.mode !== 'build' && uiRef.current.view !== 'survey') return;
          e.preventDefault(); orbit.radius = clamp(orbit.radius * Math.exp(e.deltaY * .001), 40, 180);
        };
        const blur = () => { discardDrag(); cancel(); };
        const keydown = (e: KeyboardEvent) => {
          if (e.code === 'Escape') { discardDrag(); cancel(); return; }
          if (e.target instanceof Element && e.target.closest('input,select,textarea,button,a,[contenteditable]') || uiRef.current.memoryOpen) return;
          if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) actions.current?.redo(); else actions.current?.undo(); return; }
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) { keyboardCharge = true; actions.current?.begin(); } return; }
          if (e.code === 'KeyB' && !e.repeat) actions.current?.mode(uiRef.current.mode === 'build' ? 'play' : 'build');
          if (e.code === 'KeyV' && !e.repeat) actions.current?.survey();
          if (uiRef.current.mode !== 'play') return;
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyQ', 'KeyE'].includes(e.code)) e.preventDefault();
          if (e.code === 'ArrowLeft') updateSetup({ yaw: uiRef.current.setup.yaw - .5 });
          if (e.code === 'ArrowRight') updateSetup({ yaw: uiRef.current.setup.yaw + .5 });
          if (e.code === 'ArrowUp') updateSetup({ elevation: uiRef.current.setup.elevation + .5 });
          if (e.code === 'ArrowDown') updateSetup({ elevation: uiRef.current.setup.elevation - .5 });
          if (e.code === 'KeyQ') updateSetup({ originX: uiRef.current.setup.originX - .5 });
          if (e.code === 'KeyE') updateSetup({ originX: uiRef.current.setup.originX + .5 });
        };
        const keyup = (e: KeyboardEvent) => { if (e.code === 'Space' && keyboardCharge) { keyboardCharge = false; actions.current?.release(); } };
        surface.addEventListener('pointerdown', down); surface.addEventListener('pointermove', move);
        surface.addEventListener('pointerup', up); surface.addEventListener('pointercancel', discardDrag);
        surface.addEventListener('wheel', wheel, { passive: false });
        window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
        const visibility = () => { if (document.hidden) blur(); }; document.addEventListener('visibilitychange', visibility);
        let resizeFrame = 0;
        const resize = new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => activeEngine.resize()); }); resize.observe(surface);
        scene.onBeforePhysicsObservable.add(() => runtime.beforeStep());
        scene.onAfterPhysicsObservable.add(() => runtime.afterStep());
        const qaWindow = window as unknown as { __worldcraftQA?: { snapshot(): unknown; events(): unknown } };
        if (new URLSearchParams(location.search).get('qa') === '1') {
          qaWindow.__worldcraftQA = {
            snapshot() {
              const state = uiRef.current, rect = surface.getBoundingClientRect();
              return { build: BUILD_ID, mode: state.mode, phase: state.phase, view: state.view, world: state.world,
                worldIdentity: worldcraftIdentity(state.world), selectedObjectId: state.selected, setup: state.setup,
                ...history.status(), editLock: busy(), diagnostics: runtime.diagnostics(), memory: store.status(),
                lastShot: state.last ? { ...state.last, currentWorldChanged: worldcraftIdentity(state.world) !== state.last.worldIdentity, thisShotChangedWorld: false } : null,
                comparison: state.comparison, visibleTrailMeshes: activeScene.meshes.filter(m => ['worldcraft-actual-line','worldcraft-before-line'].includes(m.name)).map(m => m.name),
                previousTrail: state.showTrail && Boolean(state.history), trailIdentity: state.history?.worldIdentity, trailLabel: state.history?.label, notice: state.notice,
                projectedObjects: [...runtime.objectMeshes].map(([id, mesh]) => {
                  const p = Vector3.Project(mesh.position, Matrix.Identity(), activeScene.getTransformMatrix(), camera.viewport.toGlobal(activeEngine.getRenderWidth(), activeEngine.getRenderHeight()));
                  return { id, x: rect.left + p.x / activeEngine.getRenderWidth() * rect.width, y: rect.top + p.y / activeEngine.getRenderHeight() * rect.height };
                }),
              };
            }, events: () => structuredClone(events),
          };
        }
        cleanup = () => {
          actions.current = null; delete qaWindow.__worldcraftQA; discardDrag(); resize.disconnect(); cancelAnimationFrame(resizeFrame);
          window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur);
          document.removeEventListener('visibilitychange', visibility);
          surface.removeEventListener('pointerdown', down); surface.removeEventListener('pointermove', move);
          surface.removeEventListener('pointerup', up); surface.removeEventListener('pointercancel', discardDrag); surface.removeEventListener('wheel', wheel);
          projectile?.dispose(); trail?.dispose(); comparisonTrail?.dispose(); spine?.dispose(); runtime.dispose(); presentation.dispose();
        };
        publish({ phase: 'ready', notice: 'House Shot: fire once, then turn the ramp. The rail and gold pin stay fixed.', ...memoryState() });
        selectedHighlight();
        activeEngine.runRenderLoop(() => {
          if (disposed) return;
          const state = uiRef.current, dt = Math.min(.05, activeEngine.getDeltaTime() / 1000), setup = state.setup;
          const radians = setup.yaw * Math.PI / 180, elevation = setup.elevation * Math.PI / 180;
          launcher.position.x = setup.originX; yaw.rotation.y = radians; loft.rotation.x = -elevation;
          const aim = new Vector3(Math.sin(radians) * Math.cos(elevation), Math.sin(elevation), Math.cos(radians) * Math.cos(elevation));
          const muzzle = new Vector3(setup.originX, 1.55, 0).add(aim.scale(RAIL_RULES.muzzleLength));
          spine = MeshBuilder.CreateLines('worldcraft-muzzle-spine', { points: [muzzle, muzzle.add(aim.scale(4))], instance: spine ?? undefined, updatable: true }, activeScene);
          spine.color = new Color3(.12, .85, .89); spine.isPickable = false;
          spine.setEnabled(state.mode === 'play' && state.view === 'address' && ['ready', 'charging'].includes(state.phase));
          const horizontal = activeEngine.getRenderWidth() < activeEngine.getRenderHeight();
          camera.fovMode = horizontal ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED;
          if (runtime.flight && projectile) projectile.sync(runtime.flight.aggregate.body.getLinearVelocity());
          if (state.phase === 'charging' && performance.now() - lastChargeUpdate > 70) {
            lastChargeUpdate = performance.now(); publish({ charge: launchCharge('hold', setup.charge, performance.now() - chargeStart) });
          }
          if (state.phase === 'flight' && runtime.flight) {
            const p = runtime.flight.mesh.position, v = runtime.flight.aggregate.body.getLinearVelocity();
            heading = followHeading(heading, v, dt);
            const frame = advanceFlightCamera({ position: camera.position, target: look, fov: camera.fov }, p, previous, followOffsets(p, v, heading), dt, activeEngine.getAspectRatio(camera), horizontal, horizontal ? .96 : .69);
            camera.position.copyFromFloats(frame.position.x, frame.position.y, frame.position.z);
            look.copyFromFloats(frame.target.x, frame.target.y, frame.target.z); camera.fov = frame.fov; previous = p.clone();
            if (++trailTick % 4 === 0) { flightPoints.push(p.clone()); if (flightPoints.length > 1024) flightPoints.shift(); drawTrail(flightPoints); }
          } else if (state.mode === 'build' || state.view === 'survey') {
            const radius = orbit.radius;
            camera.position.set(orbit.x + Math.sin(orbit.angle) * radius * Math.cos(orbit.elevation), radius * Math.sin(orbit.elevation), orbit.z - Math.cos(orbit.angle) * radius * Math.cos(orbit.elevation));
            look.set(orbit.x, 1, orbit.z); camera.fov = horizontal ? 1.02 : .78;
          } else if (state.phase !== 'result') {
            const position = new Vector3(setup.originX - Math.sin(radians) * 15, 7.8, -Math.cos(radians) * 15);
            const target = new Vector3(setup.originX + Math.sin(radians) * 34, 3.6, Math.cos(radians) * 34);
            const ease = 1 - Math.exp(-dt * 10); Vector3.LerpToRef(camera.position, position, ease, camera.position); Vector3.LerpToRef(look, target, ease, look);
            camera.fov = horizontal ? .96 : .69;
          }
          camera.setTarget(look); activeScene.render();
        });
      } catch (e) { if (!disposed) publish({ phase: 'error', notice: e instanceof Error ? e.message : String(e) }); }
    };
    void boot();
    return () => { disposed = true; cleanup(); scene?.dispose(); engine?.dispose(); };
  }, []);

  const locked = ['loading', 'error', 'charging', 'flight'].includes(ui.phase);
  const selected = ui.world.objects.find(o => o.id === ui.selected);
  const fixedRail = Boolean(worldcraftFixedSetup(ui.world));
  const fixedPiece = Boolean(selected && ui.world.rules?.locked.includes(selected.id));
  const shownSetup = ui.phase === 'flight' ? ui.setup : ui.history?.setup;
  const setupChanged = Boolean(ui.comparison && shownSetup && Object.keys(shownSetup).some(key => shownSetup[key as keyof WorldcraftSetup] !== ui.comparison!.setup[key as keyof WorldcraftSetup]));
  const earlierWorld = Boolean(ui.history && worldcraftIdentity(ui.world) !== ui.history.worldIdentity);
  const qualified = ui.last?.evidence.filter(e => e.kind === 'redirect') ?? [];
  const rampPitch = selected?.kind === 'ramp' && selected.pitch !== undefined && ui.world.rules?.rampPitch ? selected.pitch : null;
  const commitNumber = (key: 'x' | 'z' | 'yaw' | 'pitch', input: HTMLInputElement) => {
    if (input.value !== '') actions.current?.change({ [key]: Number(input.value) });
    const actual = uiRef.current.world.objects.find(o => o.id === uiRef.current.selected);
    input.value = String(actual?.[key] ?? selected?.[key] ?? 0);
  };
  const numberControl = (label: string, value: number, change: (value: number) => void, step: number, min: number, max: number) => (
    <label className={styles.field}><span className={styles.fieldLabel}>{label}<strong>{value.toFixed(1)}{label === 'Origin' ? ' m' : '°'}</strong></span>
      <input className={styles.range} aria-label={label} type="range" min={min} max={max} step={step} value={value} disabled={locked || fixedRail} onChange={e => change(Number(e.target.value))} />
    </label>
  );
  return <main className={styles.shell} data-mode={ui.mode} data-phase={ui.phase}>
    <header className={styles.header}>
      <div className={styles.brand}><span className={styles.kicker}>RAIL GOLF · LAB</span><h1 className={styles.title}>Worldcraft</h1></div>
      <div className={styles.modeSwitch} aria-label="Worldcraft mode">
        <button type="button" aria-pressed={ui.mode === 'build'} className={ui.mode === 'build' ? styles.active : ''} disabled={locked} onClick={() => actions.current?.mode('build')}>Build</button>
        <button type="button" aria-pressed={ui.mode === 'play'} className={ui.mode === 'play' ? styles.active : ''} disabled={locked} onClick={() => actions.current?.mode('play')}>Play</button>
      </div>
      <button type="button" disabled={locked} onClick={() => actions.current?.memory(true)}>Worlds &amp; lines</button>
    </header>
    <div className={styles.main}>
      <section className={styles.viewport} aria-label="Physical yard">
        <canvas ref={canvas} className={styles.canvas} aria-label={ui.mode === 'build' ? 'Build yard. Drag a piece to move it; drag empty space to move the view.' : fixedRail ? (ui.world.rules?.rampPitch ? 'Play yard. Fixed rail. Space fires the two-piece shot.' : 'Play yard. Fixed rail. Space fires the house shot.') : 'Play yard. Drag to aim. Use the fire control to launch.'} tabIndex={0} />
        <span className={styles.badge}>{ui.world.name} <small>· {ui.world.objects.length}/12 pieces</small></span>
        {(ui.mode === 'build' || ui.view === 'survey') && <div className={styles.viewTools} aria-label="View controls">
          <button type="button" aria-label="Zoom in" onClick={() => actions.current?.camera('in')}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => actions.current?.camera('out')}>−</button>
          {ui.mode === 'build' && <button type="button" disabled={!selected} aria-label="Focus selected piece" onClick={() => actions.current?.camera('focus')}>Focus</button>}
          <button type="button" onClick={() => actions.current?.camera('home')}>Center</button>
          <button type="button" aria-label="Orbit left" onClick={() => actions.current?.camera('left')}>↶</button>
          <button type="button" aria-label="Orbit right" onClick={() => actions.current?.camera('right')}>↷</button>
          <button type="button" aria-pressed={ui.cameraTool === 'pan'} onClick={() => actions.current?.camera('tool')}>{ui.cameraTool === 'pan' ? 'Pan view' : 'Orbit view'}</button>
        </div>}
        <p className={styles.hint}>{ui.comparison && ui.showTrail ? `Amber dashed: before${ui.comparison.worldIdentity !== worldcraftIdentity(ui.world) ? ' (earlier world)' : ''} · cyan: ${ui.phase === 'flight' ? 'live' : 'latest'}${earlierWorld && ui.phase !== 'flight' ? ' (earlier world)' : ''} · ${setupChanged ? 'launch setup changed' : 'same launch setup'}` : ui.phase === 'flight' ? 'Actual flight trail' : ui.history && ui.showTrail ? `${ui.history.label} · ${earlierWorld ? 'earlier world · recorded history' : 'actual recorded history'}` : ui.mode === 'build' ? 'Drag a piece · empty space moves the view' : 'One committed launch. No predicted arc.'}</p>
      </section>
      <aside ref={toolsPanel} className={styles.tools} aria-label={ui.mode === 'build' ? 'Build controls' : 'Shot controls'}>
        {ui.world.rules && <section className={styles.goal} aria-label="Fixed goal">
          <strong>First kiss inside the gold circle</strong>
          <p>Pin ({ui.world.rules.pin.x}, {ui.world.rules.pin.z}) · radius {ui.world.rules.pin.r} m. {fixedRail ? (ui.world.rules.rampPitch ? 'Rail fixed. Revise both pieces; ramp pitch steps by 5°.' : 'Rail fixed: change the piece, keep the shot.') : 'Free rail.'}</p>
          {fixedRail && <p>{ui.setup.originX} m origin · {ui.setup.yaw}° yaw · {ui.setup.elevation}° elevation · {Math.round(ui.setup.charge * 100)}% power</p>}
          <div className={styles.buttonRow}>
            <button type="button" disabled={locked} onClick={() => actions.current?.house()}>{ui.world.id === 'house-shot-v1' ? 'Reset House Shot' : 'Open House Shot'}</button>
            <button type="button" disabled={locked} onClick={() => actions.current?.pitchChallenge()}>{ui.world.id === 'two-piece-pitch-v1' ? 'Reset Two-piece pitch' : 'Open Two-piece pitch'}</button>
          </div>
        </section>}
        {ui.mode === 'build' ? <>
          <section className={styles.section}><h2 className={styles.sectionTitle}>Shape a possibility</h2>
            <div className={styles.palette}>{(['bank', 'ramp', 'block'] as Kind[]).map(kind => <button type="button" key={kind} disabled={locked || !worldcraftCanAdd(ui.world, kind)} onClick={() => actions.current?.add(kind)}>+ {kind[0].toUpperCase() + kind.slice(1)}</button>)}</div>
            <div className={styles.parts} aria-label="Pieces">{ui.world.objects.map((object, index) => <button type="button" className={`${styles.partButton} ${object.id === ui.selected ? styles.selectedPart : ''}`} aria-pressed={object.id === ui.selected} key={object.id} onClick={() => actions.current?.select(object.id)}>{index + 1}. {object.kind}{object.pitch !== undefined ? ` · ${object.pitch}°` : ''}{ui.world.rules?.locked.includes(object.id) ? ' · fixed' : ''}</button>)}</div>
          </section>
          {selected && <fieldset disabled={locked || fixedPiece} className={styles.inspector} aria-label="Selected piece">
            <h2 className={styles.sectionTitle}>{selected.kind[0].toUpperCase() + selected.kind.slice(1)}{fixedPiece ? ' · fixed' : ''} <small>{selected.kind === 'block' ? 'Dull obstacle' : selected.kind === 'ramp' ? (rampPitch !== null ? 'Incline in 5° steps' : 'Inclined rebound') : 'Timber rebound'}</small></h2>
            <div className={styles.controlRow}>
              <label className={styles.numberField}>Across · m<input key={`${selected.id}-x-${selected.x}`} aria-label="Piece X" type="number" step=".5" defaultValue={selected.x} onBlur={e => commitNumber('x', e.currentTarget)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
              <label className={styles.numberField}>Along · m<input key={`${selected.id}-z-${selected.z}`} aria-label="Piece Z" type="number" step=".5" defaultValue={selected.z} onBlur={e => commitNumber('z', e.currentTarget)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
            </div>
            <div className={styles.nudgeGrid}>
              <button type="button" aria-label="Move piece left half metre" onClick={() => actions.current?.change({ x: selected.x - .5 })}>X −.5</button>
              <button type="button" aria-label="Move piece right half metre" onClick={() => actions.current?.change({ x: selected.x + .5 })}>X +.5</button>
              <button type="button" aria-label="Move piece back half metre" onClick={() => actions.current?.change({ z: selected.z - .5 })}>Z −.5</button>
              <button type="button" aria-label="Move piece forward half metre" onClick={() => actions.current?.change({ z: selected.z + .5 })}>Z +.5</button>
            </div>
            <div className={styles.controlRow}><button type="button" aria-label="Rotate piece minus 5 degrees" onClick={() => actions.current?.change({ yaw: selected.yaw - 5 })}>−5°</button><label className={styles.numberField}>Turn<input key={`${selected.id}-yaw-${selected.yaw}`} aria-label="Piece rotation" type="number" step="5" defaultValue={selected.yaw} onBlur={e => commitNumber('yaw', e.currentTarget)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label><button type="button" aria-label="Rotate piece plus 5 degrees" onClick={() => actions.current?.change({ yaw: selected.yaw + 5 })}>+5°</button></div>
            {rampPitch !== null && <div className={styles.controlRow}><button type="button" aria-label="Decrease ramp pitch 5 degrees" disabled={rampPitch <= WORLDCRAFT_RAMP_PITCH.min} onClick={() => actions.current?.change({ pitch: rampPitch - 5 })}>−5°</button><label className={styles.numberField}>Pitch<input key={`${selected.id}-pitch-${rampPitch}`} aria-label="Ramp pitch" type="number" step="5" min={WORLDCRAFT_RAMP_PITCH.min} max={WORLDCRAFT_RAMP_PITCH.max} defaultValue={rampPitch} onBlur={e => commitNumber('pitch', e.currentTarget)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label><button type="button" aria-label="Increase ramp pitch 5 degrees" disabled={rampPitch >= WORLDCRAFT_RAMP_PITCH.max} onClick={() => actions.current?.change({ pitch: rampPitch + 5 })}>+5°</button></div>}
            <button type="button" className={styles.danger} onClick={() => actions.current?.remove()}>Remove piece</button>
          </fieldset>}
          <div className={styles.buttonRow}><button type="button" disabled={!ui.canUndo || locked} onClick={() => actions.current?.undo()}>Undo</button><button type="button" disabled={!ui.canRedo || locked} onClick={() => actions.current?.redo()}>Redo</button><button type="button" className={styles.primary} disabled={locked} onClick={() => actions.current?.mode('play')}>Try this space →</button></div>
        </> : <section className={styles.playControls}>
          <div className={styles.buttonRow}><button type="button" disabled={locked} aria-pressed={ui.view === 'survey'} onClick={() => actions.current?.survey()}>{ui.view === 'survey' ? 'Address' : 'Survey'}</button><button type="button" aria-pressed={ui.showTrail} onClick={() => actions.current?.trail()}>Show trails</button></div>
          {!fixedRail && <>
          {numberControl('Origin', ui.setup.originX, originX => actions.current?.setup({ originX }), .5, -10, 10)}
          <div className={styles.buttonRow}><button type="button" aria-label="Origin left half metre" disabled={locked} onClick={() => actions.current?.setup({ originX: ui.setup.originX - .5 })}>← .5 m</button><button type="button" aria-label="Origin right half metre" disabled={locked} onClick={() => actions.current?.setup({ originX: ui.setup.originX + .5 })}>.5 m →</button></div>
          {numberControl('Yaw', ui.setup.yaw, yaw => actions.current?.setup({ yaw }), .5, -70, 70)}
          {numberControl('Elevation', ui.setup.elevation, elevation => actions.current?.setup({ elevation }), .5, 5, 85)}
          <div className={styles.controlRow}><label className={styles.field}>Power<select aria-label="Power control" disabled={locked} value={ui.powerMode} onChange={e => actions.current?.powerMode(e.target.value as UI['powerMode'])}><option value="set">Set power</option><option value="hold">Hold to charge</option></select></label><strong>{Math.round((ui.phase === 'charging' ? ui.charge : ui.setup.charge) * 100)}%</strong></div>
          {ui.powerMode === 'set' && <input aria-label="Power" className={styles.range} disabled={locked} type="range" min="0" max="1" step=".01" value={ui.setup.charge} onChange={e => actions.current?.setup({ charge: Number(e.target.value) })} />}
          </>}
          {ui.phase === 'ready' || ui.phase === 'charging' ? <button key="launch-control" type="button" className={styles.chargeButton} aria-label={ui.powerMode === 'set' ? 'Fire line' : 'Hold to charge'}
            onClick={() => { if (ui.powerMode === 'set') actions.current?.begin(); }}
            onPointerDown={e => { if (ui.powerMode === 'hold') { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); actions.current?.begin(); } }}
            onPointerUp={e => { if (ui.powerMode === 'hold') { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); actions.current?.release(); } }}
            onPointerCancel={() => actions.current?.cancel()}
            onBlur={() => actions.current?.cancel()}
            onKeyDown={e => { if (ui.powerMode === 'hold' && ['Enter', ' '].includes(e.key) && !e.repeat) { e.preventDefault(); actions.current?.begin(); } }}
            onKeyUp={e => { if (ui.powerMode === 'hold' && ['Enter', ' '].includes(e.key)) { e.preventDefault(); actions.current?.release(); } }}>
            {ui.phase === 'charging' ? `Release · ${Math.round(ui.charge * 100)}%` : ui.powerMode === 'set' ? 'Fire line' : 'Hold to charge'}
          </button> : <button key="recovery-control" type="button" className={styles.chargeButton} disabled={ui.phase === 'loading' || ui.phase === 'error'} onClick={() => actions.current?.ready()}>{ui.phase === 'flight' ? 'Stop shot' : fixedRail ? 'Ready again · same setup' : 'Aim again · current world'}</button>}
          {ui.last && <div className={styles.receipt}><p>{ui.last.pinResult ? `${ui.last.pinResult.status === 'clear' ? 'Pin cleared' : ui.last.pinResult.status === 'miss' ? 'Pin missed' : 'No clear'}${ui.last.pinResult.distance === null ? '' : ` · ${ui.last.pinResult.distance.toFixed(1)} m from centre`}${ui.last.worldIdentity !== worldcraftIdentity(ui.world) ? ' · earlier world' : ''}` : ''}</p><p>{qualified.length ? qualified.map(e => e.label ?? e.feature).join(' → ') : 'No qualified rebound recorded.'}</p><div className={styles.buttonRow}><button type="button" disabled={locked} onClick={() => actions.current?.adjust()}>Adjust last line</button><button type="button" disabled={locked || ui.last.reason === 'interrupted' || ui.lastKept} onClick={() => actions.current?.keep()}>{ui.lastKept ? 'Kept ✓' : 'Keep line'}</button></div></div>}
        </section>}
        <p className={styles.notice} role="status">{ui.notice}</p>
        {ui.memoryWarning && <p className={styles.status}>{ui.memoryWarning}</p>}
      </aside>
    </div>
    <footer className={styles.footer}><span>Worldcraft v0.2 · isolated study</span><span>BUILD {BUILD_ID.slice(0, 7)}</span></footer>
    {ui.memoryOpen && <div ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="world-memory-title" onKeyDown={e => { if (e.key === 'Escape') actions.current?.memory(false); }}>
      <div className={styles.dialogBody}><div className={styles.dialogHeader}><h2 id="world-memory-title">Worlds &amp; kept lines</h2><button type="button" onClick={() => actions.current?.memory(false)}>Close</button></div>
        <p className={styles.muted}>Saved on this browser. A kept line includes the world it was fired in.</p>
        <label className={styles.field}>World name<input aria-label="World name" maxLength={60} defaultValue={ui.world.name} onBlur={e => actions.current?.rename(e.target.value)} /></label>
        <div className={styles.buttonRow}><button type="button" className={styles.primary} onClick={() => actions.current?.save()}>Save new world copy</button><button type="button" onClick={() => actions.current?.export()}>Export world JSON</button><button type="button" onClick={() => upload.current?.click()}>Import world JSON</button></div>
        <input ref={upload} className={styles.visuallyHidden} type="file" accept=".json,application/json" aria-label="Import world file" onChange={async e => { const file = e.target.files?.[0]; if (file) { if (file.size > 65536) actions.current?.import('oversized-file'); else actions.current?.import(await file.text()); } e.target.value = ''; }} />
        <div className={styles.memoryGrid}><section><h3>Worlds · {ui.worlds.length}/4</h3>{ui.worlds.length === 0 && <p className={styles.empty}>Save an arrangement worth revisiting.</p>}{ui.worlds.map(entry => <div className={styles.slot} key={entry.id}><strong>{entry.world.name}</strong><span>{entry.world.objects.length} pieces</span><div className={styles.buttonRow}><button type="button" onClick={() => actions.current?.load(entry.id)}>Open world</button><button type="button" className={styles.danger} onClick={() => actions.current?.forgetWorld(entry.id)}>Remove saved world</button></div></div>)}</section>
          <section><h3>Kept lines · {ui.lines.length}/4</h3>{ui.lines.length === 0 && <p className={styles.empty}>Fire a line, then Keep it. A miss is welcome.</p>}{ui.lines.map((entry, index) => <div className={styles.slot} key={entry.id}><strong>Line {index + 1} · {entry.worldSnapshot.world.name}</strong><span>{entry.setup.originX.toFixed(1)} m · {entry.setup.yaw.toFixed(1)}° · {Math.round(entry.setup.charge * 100)}%</span><div className={styles.buttonRow}><button type="button" onClick={() => actions.current?.restoreLine(entry.id)}>Restore world &amp; line</button><button type="button" className={styles.danger} onClick={() => actions.current?.forgetLine(entry.id)}>Remove kept line</button></div></div>)}</section></div>
        <div className={styles.buttonRow}><button type="button" onClick={() => actions.current?.house()}>House Shot</button><button type="button" onClick={() => actions.current?.pitchChallenge()}>Two-piece pitch</button><button type="button" onClick={() => actions.current?.starter()}>Open starter</button><button type="button" onClick={() => actions.current?.starter(true)}>Empty clearing</button></div>
        <button type="button" onClick={() => actions.current?.exportMemory()}>Export local memory</button><p className={styles.muted}>Memory export includes kept paths for safekeeping; world JSON is the playable import format.</p>
        <p className={styles.notice} role="status">{ui.notice}</p>{ui.memoryWarning && <p className={styles.status}>{ui.memoryWarning}</p>}
      </div>
    </div>}
  </main>;
}
