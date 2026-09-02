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
  assert.match(html, /Babylon\.js artillery trick-shot range/i);
  assert.doesNotMatch(html, /Starter Project|codex-preview/i);
  assert.doesNotMatch(html, /ADDRESS LAB/);
});
