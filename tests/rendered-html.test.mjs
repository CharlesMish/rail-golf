import assert from "node:assert/strict";
import test from "node:test";

test("serves the Rail Golf experience and metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Rail Golf<\/title>/i);
  assert.match(html, /physics trick-shot timber yard/i);
  assert.doesNotMatch(html, /Starter Project|codex-preview/i);
  assert.doesNotMatch(html, /ADDRESS LAB/);
  assert.match(html, /Across the Yard/);
  assert.match(html, /Winning lines/);
  assert.match(html, /BUILD .*?(?:[a-f0-9]{10}|unknown)/);
  assert.doesNotMatch(html, /Diverter Floor|SHOOT SWITCH/);
  const lab = await worker.fetch(
    new Request("http://localhost/lab/diverter", {headers:{accept:"text/html"}}),
    {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},
    {waitUntil(){},passThroughOnException(){}},
  );
  assert.equal(lab.status,200);
  const labHtml=await lab.text();
  assert.match(labHtml,/Diverter Floor/);assert.match(labHtml,/Reset Card/);
  assert.match(labHtml,/SHOOT SWITCH/);assert.match(labHtml,/Recall restores the recorded starting state/);
  assert.doesNotMatch(labHtml,/Across the Yard|Switchback Gallery|Lumber Cascade/);
  const practice = await worker.fetch(
    new Request("http://localhost/practice", {headers:{accept:"text/html"}}),
    {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},
    {waitUntil(){},passThroughOnException(){}},
  );
  assert.equal(practice.status,200);
  assert.match(await practice.text(), /Open Seat/);

  const courtyard = await worker.fetch(
    new Request("http://localhost/courtyard", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(courtyard.status, 200);
  const yardHtml = await courtyard.text();
  assert.match(yardHtml, /Across the Yard/);
  assert.match(yardHtml, /Switchback Gallery, LOCKED/);
  assert.match(yardHtml, /Timber Courtyard/);
  assert.match(yardHtml, /GOLD SKY TOKEN/);
  assert.match(yardHtml, /Lumber Cascade, LOCKED/);
  assert.match(yardHtml, /Lumber Walk/);

  const integrated = await worker.fetch(new Request("http://localhost/lab/courtyard-diverter",{headers:{accept:"text/html"}}),
    {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(integrated.status,200);
  const integratedHtml=await integrated.text();
  assert.match(integratedHtml,/The loading dock can be switched. Explore a line to the Mill Bell./);
  assert.match(integratedHtml,/FLOOR .*?A/);assert.match(integratedHtml,/BUILD/);
  assert.match(integratedHtml,/SKIP PAD/);assert.match(integratedHtml,/Reset Card/);
  assert.doesNotMatch(integratedHtml,/raises|degrees|LEVEL|RISE|Delivery route collection|Lumber Walk.*locked/);

  const lineResponse=await worker.fetch(new Request("http://localhost/lab/lines",{headers:{accept:"text/html"}}),
    {ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(lineResponse.status,200);const lineHtml=await lineResponse.text();
  assert.match(lineHtml,/NON-CANONICAL PLACEHOLDERS/);assert.match(lineHtml,/LINE TOTAL/);
  assert.match(lineHtml,/02 Switchback Gallery, OPEN/);assert.match(lineHtml,/03 Lumber Cascade, OPEN/);
  assert.match(lineHtml,/line-hud-total/);assert.match(lineHtml,/>LINE<\/span>/);assert.doesNotMatch(lineHtml,/SHOOT SWITCH|floor-state-chip/);assert.doesNotMatch(html,/line-hud-total/);
  assert.match(lineHtml,/Copy current Set Power setup/);assert.doesNotMatch(lineHtml,/Dispatch Bay|Delivery route collection/);
  assert.doesNotMatch(html,/LINE TOTAL|NON-CANONICAL|Copy current Set Power/);

});
