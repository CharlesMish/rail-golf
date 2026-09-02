import assert from "node:assert/strict";
import test from "node:test";

import { createRailGolfAudio, RUCKUS_LINE_DOUBLE_HEADROOM_CEILING } from "../lib/rail-golf-audio.js";

// A minimal, dependency-free stand-in for the Web Audio nodes the module
// touches. It doesn't render samples; it just records the automation graph
// (connections + scheduled AudioParam events) so tests can inspect real
// behaviour of the actual exported functions rather than re-parsing source
// text. Note: importing the real module means this file fails to *load* at
// all against the pre-refactor baseline (lib/rail-golf-audio.js does not
// exist there yet) — see tests/rail-golf-audio-structure.test.mjs for
// assertions that stay meaningful (and produce real numeric failures)
// against that baseline tree, and the PR body for the captured output of
// this file's baseline failure.

class FakeAudioParam {
  constructor(defaultValue) {
    this.value = defaultValue;
    this.events = [];
  }

  _record(type, value, time, timeConstant) {
    this.events.push({ type, value, time, timeConstant });
  }

  setValueAtTime(value, time) {
    this.value = value;
    this._record("setValueAtTime", value, time);
    return this;
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this._record("linearRamp", value, time);
    return this;
  }

  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this._record("exponentialRamp", value, time);
    return this;
  }

  setTargetAtTime(value, time, timeConstant) {
    this._record("setTarget", value, time, timeConstant);
    return this;
  }

  cancelScheduledValues(time) {
    this._record("cancel", null, time);
    return this;
  }

  get peakValue() {
    let peak = 0;
    for (const event of this.events) {
      if (typeof event.value === "number") peak = Math.max(peak, Math.abs(event.value));
    }
    return Math.max(peak, Math.abs(this.value ?? 0));
  }
}

class FakeAudioNode {
  constructor(kind) {
    this.kind = kind;
    this.connections = [];
  }

  connect(destination) {
    this.connections.push(destination);
    return destination;
  }
}

class FakeGainNode extends FakeAudioNode {
  constructor() {
    super("gain");
    this.gain = new FakeAudioParam(1);
  }
}

class FakeOscillatorNode extends FakeAudioNode {
  constructor() {
    super("oscillator");
    this.type = "sine";
    this.frequency = new FakeAudioParam(440);
    this.started = false;
    this.stopped = false;
  }

  start(time) {
    this.started = true;
    this.startTime = time;
  }

  stop(time) {
    this.stopped = true;
    this.stopTime = time;
  }
}

class FakeBiquadFilterNode extends FakeAudioNode {
  constructor() {
    super("biquad");
    this.type = "lowpass";
    this.frequency = new FakeAudioParam(350);
    this.Q = new FakeAudioParam(1);
  }
}

class FakeBufferSourceNode extends FakeAudioNode {
  constructor() {
    super("bufferSource");
    this.buffer = null;
  }

  start(time) {
    this.startTime = time;
  }
}

class FakeDynamicsCompressorNode extends FakeAudioNode {
  constructor() {
    super("compressor");
    this.threshold = new FakeAudioParam(-24);
    this.knee = new FakeAudioParam(30);
    this.ratio = new FakeAudioParam(12);
    this.attack = new FakeAudioParam(0.003);
    this.release = new FakeAudioParam(0.25);
  }
}

class FakeAudioBuffer {
  constructor(numberOfChannels, length, sampleRate) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this._channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel) {
    return this._channels[channel];
  }
}

class FakeAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.state = "running";
    this.destination = new FakeAudioNode("destination");
    this.createdGainNodes = [];
    this.createdOscillators = [];
    this.createdFilters = [];
    this.createdBufferSources = [];
    this.createdCompressors = [];
  }

  createGain() {
    const node = new FakeGainNode();
    this.createdGainNodes.push(node);
    return node;
  }

  createOscillator() {
    const node = new FakeOscillatorNode();
    this.createdOscillators.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = new FakeBiquadFilterNode();
    this.createdFilters.push(node);
    return node;
  }

  createBufferSource() {
    const node = new FakeBufferSourceNode();
    this.createdBufferSources.push(node);
    return node;
  }

  createDynamicsCompressor() {
    const node = new FakeDynamicsCompressorNode();
    this.createdCompressors.push(node);
    return node;
  }

  createBuffer(numberOfChannels, length, sampleRate) {
    return new FakeAudioBuffer(numberOfChannels, length, sampleRate);
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

function allNodes(context) {
  return [
    ...context.createdGainNodes,
    ...context.createdOscillators,
    ...context.createdFilters,
    ...context.createdBufferSources,
    ...context.createdCompressors,
  ];
}

function reachesDestination(node, context, visited = new Set()) {
  if (visited.has(node)) return false;
  visited.add(node);
  if (node.connections.includes(context.destination)) return true;
  return node.connections.some((next) => next instanceof FakeAudioNode && reachesDestination(next, context, visited));
}

test("every voice created during a Ruckus-Line double routes through the master bus, not destination directly", () => {
  const context = new FakeAudioContext();
  const engine = createRailGolfAudio({ createContext: () => context });

  engine.startFlightTone();
  context.currentTime = 0.3;
  engine.playBreach();
  context.currentTime = 0.6;
  engine.playRuling("double");

  const nodes = allNodes(context);
  const directDestinationConnections = nodes.filter((node) => node.connections.includes(context.destination));
  assert.equal(
    directDestinationConnections.length,
    1,
    `expected exactly one node connected directly to destination (the master bus compressor); found ${directDestinationConnections.length}`,
  );
  assert.equal(directDestinationConnections[0].kind, "compressor");

  const masterGainNode = context.createdGainNodes.find((node) =>
    node.connections.some((target) => target.kind === "compressor"),
  );
  assert.ok(masterGainNode, "expected a master bus gain node feeding the compressor");

  const voiceGainNodes = context.createdGainNodes.filter((node) => node !== masterGainNode);
  // flight sustain + breach tone + breach noise + double tone x2 + double noise
  assert.equal(voiceGainNodes.length, 6, `expected 6 voice gain nodes, found ${voiceGainNodes.length}`);

  for (const node of voiceGainNodes) {
    assert.ok(
      reachesDestination(node, context),
      "every voice gain node must eventually reach destination through the master bus",
    );
    assert.ok(
      !node.connections.includes(context.destination),
      "no voice gain node may connect directly to destination",
    );
  }
});

test("a breach ducks the sustained flight tone instead of letting it ring at full gain underneath", () => {
  const context = new FakeAudioContext();
  const engine = createRailGolfAudio({ createContext: () => context });

  engine.startFlightTone();
  const flightGainNode = context.createdGainNodes[context.createdGainNodes.length - 1];
  const peakBeforeBreach = flightGainNode.gain.peakValue;

  context.currentTime = 0.3;
  engine.playBreach();

  const duckEvents = flightGainNode.gain.events.filter((event) => event.type === "setTarget");
  assert.ok(duckEvents.length > 0, "expected playBreach() to schedule a duck (setTargetAtTime) on the flight tone gain");
  assert.ok(
    duckEvents.some((event) => event.value < peakBeforeBreach),
    "expected the duck to target a gain below the flight tone's sustained peak",
  );
});

test("the worst-case Ruckus-Line double cluster (real scheduled peaks) stays under the exported headroom ceiling", () => {
  const context = new FakeAudioContext();
  const engine = createRailGolfAudio({ createContext: () => context });

  engine.startFlightTone();
  context.currentTime = 0.3;
  engine.playBreach();
  context.currentTime = 0.6;
  engine.playRuling("double");

  const masterGainNode = context.createdGainNodes.find((node) =>
    node.connections.some((target) => target.kind === "compressor"),
  );
  const voiceGainNodes = context.createdGainNodes.filter((node) => node !== masterGainNode);
  const total = voiceGainNodes.reduce((sum, node) => sum + node.gain.peakValue, 0);

  assert.ok(
    total <= RUCKUS_LINE_DOUBLE_HEADROOM_CEILING,
    `cluster peak sum ${total.toFixed(3)} exceeds the ${RUCKUS_LINE_DOUBLE_HEADROOM_CEILING} headroom ceiling`,
  );
});

test("muting stops the sustained tones and suppresses new sound", () => {
  const context = new FakeAudioContext();
  const engine = createRailGolfAudio({ createContext: () => context });

  engine.startFlightTone();
  const gainCountBeforeMute = context.createdGainNodes.length;

  engine.setMuted(true);
  assert.equal(engine.isMuted(), true);

  engine.playBreach();
  assert.equal(
    context.createdGainNodes.length,
    gainCountBeforeMute,
    "muted engine must not create new voices",
  );

  engine.setMuted(false);
  engine.playBreach();
  assert.ok(context.createdGainNodes.length > gainCountBeforeMute, "unmuted engine should create voices again");
});
