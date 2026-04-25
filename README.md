# PokeGrade

An Expo (React Native) app that grades Pokémon cards from a phone photo. Capture a card → AI evaluates corners, edges, centering, and surface → save to a personal vault with live market pricing.

Built on **Firebase Callable Functions** (Gemini 2.5 Flash for grading + the Pokémon TCG API for pricing) with anonymous auth and per-user Firestore collections. Monetized via Google Mobile Ads.

## Stack

- **App**: Expo SDK 55, React Native 0.83, React 19.2, Expo Router 55
- **Backend**: Firebase Functions (Node 22), Firestore, Cloud Storage
- **AI**: Gemini 2.5 Flash with a typed JSON response schema
- **Pricing**: Pokémon TCG API (cached 24 h)
- **Native modules**: `@react-native-firebase/*`, `react-native-google-mobile-ads` — Expo Go is **not** supported; you need a dev-client build.

## Project layout

```
app/                  Expo Router screens (Scan, Analyzing, Results, Collection)
components/           UI components (legacy + new components/holo/* design system)
contexts/ScanContext  Ephemeral scan state
services/             Firebase auth, scanCard pipeline, collection CRUD
theme/                Design tokens (colors, energy palette, tiers, typography)
types/                Shared TS types
functions/src/        Firebase Functions (scanCard, gradeCardFromBase64, lookupCard, cleanup)
firestore.rules       Firestore security rules
storage.rules         Cloud Storage rules
```

## Setup

```bash
# 1. Install JS deps
npm install
cd functions && npm install && cd ..

# 2. Configure the Gemini API key for Functions
#    Create functions/.env (or .env.<project>) with:
#    GEMINI_API_KEY=...

# 3. Sign in to EAS / Firebase as needed
npx eas login
firebase login
```

Firebase config files (`google-services.json`, `GoogleService-Info.plist`) are committed and required for EAS builds.

## Run

```bash
# Local dev — requires a dev-client build, not Expo Go
npm start
npm run ios
npm run android

# Functions — local emulator
cd functions
npm run serve
```

## Builds

```bash
# Dev client (rebuild whenever native modules change)
eas build --profile development --platform ios
eas build --profile development --platform android

# Internal preview / production
eas build --profile preview
eas build --profile production
```

## Deploy Functions

```bash
cd functions
npm run deploy
```

## Architecture

End-to-end scan pipeline:

1. **Capture** — `expo-camera` shoots a frame, stashed in `ScanContext`.
2. **Compress + upload** — `services/scanCard.ts` resizes to 800w / JPEG q0.7, uploads to `scans/{uid}/{ts}.jpg`.
3. **Grade** — Cloud Function `scanCard` (v1 callable, 300s/1GB) calls Gemini with a typed schema, then looks up the card in the Pokémon TCG API.
4. **Save** — `services/collection.ts#saveCard` flattens the result into `users/{uid}/cards/{cardId}` and increments `scanCount`.
5. **Cleanup** — v2 scheduled function `cleanupOrphanedImages` deletes Storage files older than 24 h with no card reference.

Anonymous auth is the only auth mode; rate limiting (30 scans/hour) is enforced server-side in a Firestore transaction.

## Security rules

- `firestore.rules`: `users/{uid}` and `users/{uid}/cards` are owner-only; `priceCache` is server-write; `rateLimits` is fully server-side.
- `storage.rules`: `scans/{uid}/{file}` — uid-scoped, 1 MB cap, `image/jpeg` only.

## Design system

The UI is being rebuilt around the **Holo Arena** design language: deep midnight surface, multi-accent energy palette per type (Fire, Water, Grass, Electric, Psychic, …), Bricolage Grotesque + Geist typography, holo-foil treatments for top-tier cards. Tokens live in `theme/`; primitives live in `components/holo/`.

## Internal docs

Engineering details live in [`CLAUDE.md`](./CLAUDE.md) — Firestore schema, Gemini contract, error mapping, native-module caveats, and the v1/v2 Functions split.

## License

Private project. All card-grading output is an estimate only and is not a substitute for professional services like PSA or Beckett.
