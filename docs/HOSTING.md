# Hosting

Rail Golf is a Vinext plus Cloudflare Worker app with a Babylon.js / Havok client. It is not a static site. Keep npm run build / scripts/build-verified.sh (vinext build). Do not flatten the app or set output export.

Progress is stored in localStorage. Do not provision D1 or R2.

## Cloudflare Workers Builds

GitHub-connected Cloudflare Workers Builds should:

1. Node 22.13.0 (engines >=22.13.0; GitHub CI uses 22.13.0)
2. npm ci (NOT npm run install:ci; that script is for the ChatGPT Sites sandbox)
3. npm run build (bounded vinext build via scripts/build-verified.sh)
4. Production: npx wrangler deploy
5. Non-prod previews: npx wrangler versions upload

The architecture supports Wrangler versions upload (no Durable Objects).

Optional: if the 3-minute GNU timeout around vinext build is too short on a given runner, set SITES_BUILD_TIMEOUT=8m for that run only. Do not remove the timeout wrapper.

wrangler.jsonc is the source Worker config. After vinext build, Wrangler uses .wrangler/deploy/config.json from @cloudflare/vite-plugin (the plugin fills assets.directory with dist/client). Do not set assets.directory in wrangler.jsonc.

## Bindings

- ASSETS: static assets fetcher (required)
- IMAGES: Vinext image optimizer (keep)

Do not add d1_databases or r2_buckets to wrangler.jsonc. .openai/hosting.json still has d1: null / r2: null leftover from ChatGPT Sites; those stay unused.

Do not add COOP/COEP headers. Havok is loaded as the default WASM asset (import HavokPhysics from @babylonjs/havok); the .wasm MIME type from the file extension is enough. There is no SharedArrayBuffer usage.

## URLs

Preview URLs (workers_dev + preview_urls) are the phone-test gate.

The intended future URL https://rail-golf.cmish.dev/ is **not** attached. Do not add custom_domain or routes in this change.

## Device notes

iOS Safari older than 16.4 lacks Havok WASM SIMD. Preview on a current phone (iOS 16.4+).

## Secrets

Never commit Cloudflare tokens, .dev.vars*, or other credentials. Configure account credentials in the Cloudflare dashboard / CI secrets, not in this repository.
