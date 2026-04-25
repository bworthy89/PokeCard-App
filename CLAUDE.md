# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**PokeGrade** — an Expo (React Native) app that photographs a Pokémon card, sends it to a Firebase Callable function that runs Gemini for grading and the Pokémon TCG API for pricing, then saves results to a per-user Firestore collection. Monetized via Google Mobile Ads (AdMob).

Bundle ID / package: `com.worthymedia.pokegrade`. EAS project: `8d347456-fd11-40a4-a671-593e2e4efe53`.

## Commands

App (from repo root):
- `npm start` / `expo start` — Metro (requires dev client since `@react-native-firebase/*` and AdMob are native)
- `npm run ios` / `npm run android` — Expo with a platform target
- EAS builds: `eas build --profile development|preview|production` (see `eas.json`)

Functions (from `functions/`):
- `npm run build` — tsc to `lib/`
- `npm run serve` — build + `firebase emulators:start --only functions`
- `npm run deploy` — `firebase deploy --only functions`
- Node 22 runtime (pinned in `functions/package.json#engines`).
- Gemini key: read via `defineString('GEMINI_API_KEY')` from `firebase-functions/params`. Set via a `.env`/`.env.<project>` file in `functions/`, the deploy-time prompt, or the Firebase console — there is no `functions:config:set` flow.

No test runner, linter, or formatter is configured in either package.

## Architecture

### Scan pipeline (end-to-end)
Anonymous auth is the only auth mode. `services/firebase.ts#signInAnonymously` is called at every entry point and also seeds `users/{uid}` with `scanCount`.

1. `app/index.tsx` (Camera tab) captures a photo via `expo-camera`, stashes the URI in `ScanContext`, and routes to `/analyzing`.
2. `services/scanCard.ts` compresses the image with `expo-image-manipulator` (resize 800w, JPEG q0.7), uploads to `scans/{uid}/{ts}.jpg` in Storage, and invokes the `scanCard` callable with `{ imageUrl, storagePath }`.
3. `functions/src/index.ts#scanCard` (v1 callable, `runWith({ timeoutSeconds: 300, memory: '1GB' })` — client matches with `httpsCallable(name, { timeout: 300000 })` in `services/firebase.ts#getCallable`) runs rate-limit check and image fetch in parallel, calls `gradeCardFromBase64` (Gemini 2.5 Flash with a JSON response schema), then `lookupCard` against the Pokémon TCG API. Returns `{ grading, price, pokemonTcgId, imageUrl, storagePath, cardArtworkUrl }`.
4. `/results` displays; on save, `services/collection.ts#saveCard` writes to `users/{uid}/cards/{auto}` and increments `scanCount`.

### Expo Router layout
File-based routing under `app/`. `_layout.tsx` defines two visible tabs (`index`=Scan, `collection`) and hides `analyzing`/`results` (`href: null`) — those are reached by `router.push`. `ScanProvider` wraps the whole tree and holds the ephemeral scan state (`imageUri`, `scanResult`, `scanError`, `isLoading`).

### Firestore schema
- `users/{uid}` — `{ createdAt, scanCount }`
- `users/{uid}/cards/{cardId}` — flattened grading fields plus `imageUrl`, `storagePath`, `cardArtworkUrl`, `pokemonTcgId`, `rawValue` (price object), `scannedAt`. Note that `collection.ts#getCards` re-nests this into `SavedCard.grading` on read — keep the flatten/nest pair in sync when adding fields.
- `priceCache/{pokemonTcgId}` — TCG price cached for 24h (server-side only).
- `rateLimits/{uid}` — `{ timestamps: number[] }`, 30 scans per rolling hour, enforced in a Firestore transaction.

### Gemini contract
`functions/src/gemini.ts` pins `gemini-2.5-flash` with `responseMimeType: application/json` and an explicit `responseSchema`. The `GradingResult` TS interface, the schema, and `SYSTEM_PROMPT`'s tier thresholds must stay aligned — changing one without the others will silently break parsing or grading logic. Shared grading fields are duplicated in `types/index.ts#GeminiGradingResult` (app side).

### Error mapping
Backend throws `HttpsError` with codes `unauthenticated` / `invalid-argument` / `resource-exhausted`. `services/scanCard.ts` maps `functions/resource-exhausted` → `quota_exceeded` and `functions/invalid-argument` → `blurry_image`; everything else (including `unauthenticated`) falls through to `network_error`. The `ErrorType` union in `types/index.ts` (rendered by `components/ErrorMessage.tsx`) also includes `not_pokemon_card`, `camera_permission_denied`, `card_not_found`, and `unknown` — wire new branches through all three files.

### Cleanup
`cleanupOrphanedImages` (v2 scheduled function from `firebase-functions/v2/scheduler`, every 24h) deletes `scans/*` files older than 24h that aren't referenced by any card doc — path convention `scans/{uid}/{file}` is load-bearing. Note the v1/v2 split: `scanCard` uses `firebase-functions/v1` (`functions.https.onCall`, `functions.https.HttpsError`) while `cleanupOrphanedImages` uses v2 — don't mix the import styles.

### Security rules
- `firestore.rules`: `users/{uid}` and `users/{uid}/cards/{cardId}` allow read/write only by the owning uid; `priceCache` is client-readable, write-blocked (server-only); `rateLimits` is fully blocked from clients.
- `storage.rules`: `scans/{uid}/{fileName}` — uid-scoped read/write, with a 1MB cap and `image/jpeg` content-type required. The 800w/q0.7 client compression is sized to fit under this cap.

## Native-module caveats

- `@react-native-firebase/*` and `react-native-google-mobile-ads` are native — Expo Go will not work. Use `expo-dev-client` builds. `google-services.json` and `GoogleService-Info.plist` are committed and required by EAS.
- AdMob app IDs (`ca-app-pub-3861217447065696~1823111579` for both platforms) live in `app.json` under the `react-native-google-mobile-ads` plugin config. The banner *unit* ID in `components/AdBanner.tsx` is still the placeholder `'YOUR_PRODUCTION_AD_UNIT_ID'` (production builds will fall back to `TestIds.BANNER` only in `__DEV__`) — replace before shipping.
- React 19.2 / React Native 0.83 / Expo SDK 55 / `expo-router` 55. EAS profiles in `eas.json`: `development` (dev client, internal), `preview` (internal), `production` (autoIncrement).

## Code review workflow (CodeRabbit CLI)

`coderabbit` is installed at `~/.local/bin/coderabbit` and authenticated. Run an automated review at **meaningful checkpoints** — end of a phase, before opening or updating a PR, after a substantial change set — **not on every commit**. Costs a review credit per invocation.

```bash
coderabbit review --base main --agent
```

`--agent` emits structured findings. For each finding:

1. **Verify against the current code first** — read the cited file/lines. Findings are sometimes wrong (premise doesn't match the actual code) or scope-violating (suggest behavioral changes outside the current task).
2. **Apply the fix only if the finding is correct and in-scope.** Don't apply scope-creep changes (e.g., moving lazy auth to eager auth, refactoring unrelated code) — note them and skip.
3. **Skip and explain** when wrong/redundant/out-of-scope. State the verification reasoning.
4. **Run `npx tsc --noEmit`** after fixes; commit + push only if it passes.

Pair fixes into one commit when they're closely related (e.g., a single review round); use separate commits when the fixes touch unrelated concerns. Reference the finding category in the commit subject (`fix(holo): …`, `chore(fonts): …`).
