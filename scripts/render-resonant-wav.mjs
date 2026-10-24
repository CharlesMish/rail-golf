// Render one logged resonant contact sequence with Chrome's OfflineAudioContext.
// Node has no WebAudio. The page imports the same lib/worldcraft-resonance.js
// the game uses and returns a wav.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sweep = JSON.parse(await readFile(new URL('../docs/experiments/wc-exp-20261024-resonant-sweep.json', import.meta.url), 'utf8'));
const impacts = sweep.audioSequence?.notes;
if (!impacts?.length) throw new Error('Sweep has no audio sequence');

const html = `<!doctype html><meta charset="utf-8"><script type="module">
import { renderResonanceWav } from '/lib/worldcraft-resonance.js';
const impacts = ${JSON.stringify(impacts)};
window.renderWav = () => renderResonanceWav(impacts).then(wav => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < wav.length; i += chunk) binary += String.fromCharCode(...wav.subarray(i, i + chunk));
  return btoa(binary);
});
</script>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/render.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(html);
      return;
    }
    if (url.pathname.startsWith('/lib/') && url.pathname.endsWith('.js')) {
      const file = await readFile(new URL(`..${url.pathname}`, import.meta.url));
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.end(file);
      return;
    }
    res.statusCode = 404;
    res.end('missing');
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const profile = await mkdtemp(join(tmpdir(), 'resonant-chrome-'));
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=9333',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore' });

async function targets() {
  const response = await fetch('http://127.0.0.1:9333/json/list');
  if (!response.ok) throw new Error(`debugger list ${response.status}`);
  return response.json();
}
let page;
for (let i = 0; i < 50; i += 1) {
  try {
    const list = await targets();
    page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    if (page) break;
  } catch { /* Chrome is still binding the port. */ }
  await new Promise(resolve => setTimeout(resolve, 100));
}
if (!page) throw new Error('Chrome did not expose a page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
let nextId = 0;
function cdp(method, params) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
try {
  let ready = false;
  for (let i = 0; i < 50 && !ready; i += 1) {
    const probed = await cdp('Runtime.evaluate', { expression: 'typeof window.renderWav', returnByValue: true });
    ready = probed.result?.value === 'function';
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Offline renderer did not load');
  const rendered = await cdp('Runtime.evaluate', {
    expression: 'window.renderWav()',
    awaitPromise: true,
    returnByValue: true,
  });
  if (rendered.exceptionDetails) throw new Error(JSON.stringify(rendered.exceptionDetails));
  const wav = Buffer.from(rendered.result.value, 'base64');
  if (wav.subarray(0, 4).toString() !== 'RIFF' || wav.subarray(8, 12).toString() !== 'WAVE') throw new Error('Chrome did not return a wav');
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const rate = view.getUint32(24, true);
  const dataBytes = view.getUint32(40, true);
  let peak = 0;
  for (let offset = 44; offset < 44 + dataBytes; offset += 2) peak = Math.max(peak, Math.abs(view.getInt16(offset, true)) / 32768);
  if (!(peak > 0.01)) throw new Error(`Rendered wav is silent (peak ${peak})`);
  const out = new URL('../docs/experiments/wc-exp-20261024-resonant.wav', import.meta.url);
  await writeFile(out, wav);
  console.log(JSON.stringify({
    bytes: wav.length,
    sampleRate: rate,
    seconds: dataBytes / 2 / rate,
    peak,
    sequence: sweep.audioSequence.sequence,
    source: 'OfflineAudioContext',
  }));
} finally {
  ws.close();
  if (chrome.exitCode === null && !chrome.killed) chrome.kill('SIGKILL');
  await new Promise(resolve => {
    if (chrome.exitCode !== null || chrome.signalCode) resolve();
    else chrome.once('exit', resolve);
  });
  server.close();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
