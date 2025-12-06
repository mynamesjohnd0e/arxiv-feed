# AGENT.md — Onboarding & Agent Playbook

Purpose: concise, actionable onboarding for automation agents and human contributors working on the `arxiv-feed` project.

1) Quick architecture
  - `backend/` — ESM Node.js Express API. Key files: `backend/src/index.js`, `backend/src/arxiv.js`, `backend/src/summarize.js`.
  - `mobile/` — Expo React Native app. Key screens: `mobile/screens/FeedScreen.js`, `mobile/screens/PaperDetailScreen.js`.
  - Data flow: backend fetches arXiv XML -> parses with `xml2js` -> sends abstracts to Anthropic (`@anthropic-ai/sdk`) -> caches summarized papers in `cachedFeed` -> serves `/api/*` endpoints -> mobile consumes `/api/feed`.

2) Environment & prerequisites
  - Node >= 18 (Node global `fetch` is used). Use `nvm`/`nvm-windows` if needed.
  - Backend secrets: create `backend/.env` with `ANTHROPIC_API_KEY=...`.
  - Mobile: Expo SDK version in `mobile/package.json` (`~54.0.0`). Use `npx expo` for running.

3) Common commands (copyable)
  - Backend dev:
    - `cd backend`
    - `npm install`
    - `npm run dev`  # runs `node --watch src/index.js`
  - Backend production:
    - `npm start`
  - Backend tests (Node >=18 required):
    - `npm test`  # runs Jest via `node --experimental-vm-modules`
  - Mobile dev:
    - `cd mobile`
    - `npm install`
    - `npx expo start`
    - Use `npx expo start --tunnel` if testing on physical devices without editing `API_URL`.

4) Local dev tips
  - Mobile `API_URL` is hardcoded to a production URL in `mobile/screens/FeedScreen.js`. For local testing either:
    - Replace `API_URL` with your machine IP, e.g. `http://192.168.1.5:3001` (ensure firewall allows incoming), OR
    - Launch Expo with `--tunnel` so the device can reach `localhost` without editing source.
  - Force backend to refresh summarization cache: `GET /api/feed?refresh=true`.
  - If Anthropic responses fail JSON parsing, `summarize.js` falls back to a minimal object; tests should assert both happy and fallback paths.

5) Tests and CI considerations
  - Backend tests use Jest; test runner is invoked via `node --experimental-vm-modules`. Ensure Node version compatibility in CI.
  - Mobile tests use `jest-expo` preset in `mobile/package.json`.
  - When adding tests that rely on network calls, prefer mocking `fetch`, `xml2js` parsing results, and Anthropic SDK responses.

6) Integration points & risky change areas
  - Anthropic prompt + parser: `backend/src/summarize.js` expects model to reply with valid JSON only. Changing the model or prompt requires updating parsing logic and mobile UI assumptions (`headline`, `summary`, `keyTakeaway`, `tags`).
  - Category lists: `AI_CATEGORIES` in `arxiv.js` and `CATEGORY_MAP` in `index.js` must stay consistent if modified.
  - Avoid converting backend to CommonJS — project relies on ESM (`type: "module"`).

7) Debugging tips
  - To inspect raw arXiv responses, call `fetchArxivPapers()` locally from a small script or add temporary logging in `backend/src/arxiv.js`.
  - To check Anthropic output shape, add a short script that calls `summarizePaper()` with one sample paper (ensure `ANTHROPIC_API_KEY` present).
  - If tests fail on CI with `--experimental-vm-modules`, ensure the CI Node version >= local dev version.

8) Small PR checklist for contributors
  - Update `AI_CATEGORIES` and `CATEGORY_MAP` together when adding/removing categories.
  - If you change the Anthropic model or prompt, update `backend/src/summarize.js` and add a test that asserts JSON parse success and fallback behavior.
  - Do not commit `backend/.env` or API keys.

9) Who to ask / where to look
  - Start with `arxiv-feed/CLAUDE.md` for agent-focused guidance.
  - Read `backend/src/index.js`, `backend/src/arxiv.js`, `backend/src/summarize.js` for truth about behavior.

If you want, I can also:
  - Add a one-file `run-local.ps1` to start backend + open Expo tunnel.
  - Create minimal test harnesses that mock Anthropic and arXiv for faster dev feedback.
