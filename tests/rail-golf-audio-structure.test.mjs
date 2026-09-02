import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// These tests read source *text* rather than importing the audio module.
// That keeps them meaningful even against a tree that has not done the
// extraction yet (the pre-refactor baseline): they fall back to reading
// app/manners-game.tsx directly, so the same assertions that pass against
// the new lib/rail-golf-audio.js module produce real, numeric failures
// against the inline baseline implementation instead of a bare import
// crash. See the PR body for the captured baseline TAP output.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioModulePath = path.join(repoRoot, "lib", "rail-golf-audio.js");
const mannersPath = path.join(repoRoot, "app", "manners-game.tsx");

const mannersSource = fs.readFileSync(mannersPath, "utf8");
const audioModuleExists = fs.existsSync(audioModulePath);
const audioSource = audioModuleExists ? fs.readFileSync(audioModulePath, "utf8") : "";

// The "audio source" under test: the extracted module if it exists,
// otherwise (baseline) the inline implementation in manners-game.tsx.
const primarySource = audioModuleExists ? audioSource : mannersSource;

const DESTINATION_CONNECT_RE = /\.connect\(\s*[A-Za-z0-9_$]*(?:\.[A-Za-z0-9_$]+)*\.destination\s*\)/g;

function findMatches(source, re) {
  return [...source.matchAll(re)].map((match) => match[0]);
}

function lineContaining(source, needle) {
  const index = source.indexOf(needle);
  if (index === -1) return "";
  const lineStart = source.lastIndexOf("\n", index) + 1;
  const lineEnd = source.indexOf("\n", index);
  return source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd).trim();
}

test("app/manners-game.tsx never connects an audio node directly to destination", () => {
  const matches = findMatches(mannersSource, DESTINATION_CONNECT_RE);
  assert.deepEqual(
    matches,
    [],
    `app/manners-game.tsx must route all audio through the extracted module's master bus; ` +
      `found direct destination connection(s): ${JSON.stringify(matches)}`,
  );
});

test("exactly one node connects to destination anywhere, and it is the master bus", () => {
  assert.ok(
    audioModuleExists,
    "lib/rail-golf-audio.js (the extracted audio module) does not exist; audio has not been moved out of manners-game.tsx",
  );

  const matches = findMatches(audioSource, DESTINATION_CONNECT_RE);
  assert.equal(
    matches.length,
    1,
    `expected exactly one destination connection (the master bus compressor); found ${matches.length}: ${JSON.stringify(matches)}. ` +
      `Every tone()/noise()/chargeTone/flightTone voice must route into the master bus gain instead of destination directly.`,
  );

  const [solitaryMatch] = matches;
  const line = lineContaining(audioSource, solitaryMatch);
  assert.match(
    line,
    /compressor/i,
    `the sole destination connection must be the compressor draining the master bus, found: "${line}"`,
  );
});

// --- Ruckus-Line "double" headroom cluster -------------------------------
//
// The cluster is: the sustained flight tone (still ringing when a breach
// lands) + playBreach() (mechanism-breach tone + noise) + playRuling
// ("double") (the two-tone chime + noise that fires when the same shot also
// seats the target). This is the exact overlap Ruckus Line produces on a
// "double": breach the gate, then land on the far bell in the same flight.
//
// The assertion sums each voice's *peak* linear gain (the worst case, full
// constructive overlap — the same conservative arithmetic the baseline's
// ~0.73 figure uses) and checks it against the module's own stated ceiling.

function extractBlock(source, name) {
  // Match an actual function/const declaration for `name`, not a mention of
  // it in a comment (e.g. "See playBreach() for details").
  const declarationRe = new RegExp(
    `(?:function\\s+${name}\\s*\\(|(?:const|let)\\s+${name}\\s*=\\s*(?:function\\s*)?\\()`,
  );
  const declarationMatch = source.match(declarationRe);
  if (!declarationMatch) return null;
  const nameIndex = declarationMatch.index;
  const braceStart = source.indexOf("{", nameIndex);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

function extractBranch(block, marker, endMarkers) {
  if (!block) return null;
  const markerIndex = block.indexOf(marker);
  if (markerIndex === -1) return null;
  let end = block.length;
  for (const endMarker of endMarkers) {
    const endIndex = block.indexOf(endMarker, markerIndex + marker.length);
    if (endIndex !== -1) end = Math.min(end, endIndex + endMarker.length);
  }
  return block.slice(markerIndex, end);
}

function argAt(argList, index) {
  const args = argList.split(",").map((arg) => arg.trim());
  return Number.parseFloat(args[index]);
}

function toneGains(text) {
  if (!text) return [];
  const gains = [];
  for (const match of text.matchAll(/\btone\(([^)]*)\)/g)) {
    const value = argAt(match[1], 3);
    if (Number.isFinite(value)) gains.push(value);
  }
  return gains;
}

function noiseGains(text) {
  if (!text) return [];
  const gains = [];
  for (const match of text.matchAll(/\bnoise\(([^)]*)\)/g)) {
    const value = argAt(match[1], 1);
    if (Number.isFinite(value)) gains.push(value);
  }
  return gains;
}

function resolveConstant(source, token) {
  if (!token) return null;
  if (/^[0-9.]+$/.test(token)) return Number.parseFloat(token);
  const re = new RegExp(`\\b${token}\\s*=\\s*([0-9]*\\.?[0-9]+)\\b(?!\\s*\\*)`);
  const match = source.match(re);
  return match ? Number.parseFloat(match[1]) : null;
}

function flightToneGain(source) {
  const block = extractBlock(source, "startFlightTone");
  if (!block) return null;
  const candidates = [];
  for (const match of block.matchAll(/gain\.value\s*=\s*([A-Za-z0-9_.]+)/g)) {
    candidates.push(resolveConstant(source, match[1]));
  }
  for (const match of block.matchAll(/RampToValueAtTime\(\s*([A-Za-z0-9_.]+)/g)) {
    candidates.push(resolveConstant(source, match[1]));
  }
  const finite = candidates.filter((value) => Number.isFinite(value));
  return finite.length ? Math.max(...finite) : null;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

test("worst-case Ruckus-Line double cluster gain stays under the module's headroom ceiling", () => {
  const flightGain = flightToneGain(primarySource);
  assert.ok(
    flightGain !== null,
    "could not find the flight tone's sustained gain (startFlightTone) in the audio source",
  );

  const breachBlock = extractBlock(primarySource, "playBreach");
  assert.ok(breachBlock, "could not find playBreach() in the audio source");
  const breachToneGains = toneGains(breachBlock);
  const breachNoiseGains = noiseGains(breachBlock);
  assert.equal(breachToneGains.length, 1, "expected playBreach() to schedule exactly one tone()");
  assert.equal(breachNoiseGains.length, 1, "expected playBreach() to schedule exactly one noise()");

  const rulingBlock = extractBlock(primarySource, "playRuling");
  assert.ok(rulingBlock, "could not find playRuling() in the audio source");
  const doubleBranch = extractBranch(rulingBlock, '"double"', ["return;"]);
  assert.ok(doubleBranch, 'could not find the outcome === "double" branch inside playRuling()');
  const doubleToneGains = toneGains(doubleBranch);
  const doubleNoiseGains = noiseGains(doubleBranch);
  assert.equal(doubleToneGains.length, 2, 'expected the "double" ruling to schedule exactly two tone() chimes');
  assert.equal(doubleNoiseGains.length, 1, 'expected the "double" ruling to schedule exactly one noise() tick');

  const total =
    flightGain + sum(breachToneGains) + sum(breachNoiseGains) + sum(doubleToneGains) + sum(doubleNoiseGains);

  const ceilingMatch = audioSource.match(/HEADROOM_CEILING\s*=\s*([0-9]*\.?[0-9]+)/);
  const ceiling = ceilingMatch ? Number.parseFloat(ceilingMatch[1]) : 0.45;

  assert.ok(
    total <= ceiling,
    `Ruckus-Line double cluster sums to ${total.toFixed(3)} ` +
      `(flight ${flightGain} + breach tone ${sum(breachToneGains).toFixed(3)} + breach noise ${sum(breachNoiseGains).toFixed(3)} ` +
      `+ ruling tones ${sum(doubleToneGains).toFixed(3)} + ruling noise ${sum(doubleNoiseGains).toFixed(3)}), ` +
      `which exceeds the ${ceiling} headroom ceiling`,
  );
});
