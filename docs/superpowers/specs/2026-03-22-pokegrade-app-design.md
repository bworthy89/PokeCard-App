# PokeGrade App Design Spec

## Overview

A cross-platform mobile app (React Native / Expo) that lets casual Pokemon card collectors scan their cards with the phone camera to get an estimated quality grade and market value. The app opens straight to the camera for a scan-first experience, returns a simplified grade tier with detailed subgrades, and shows estimated value for both raw and graded cards.

**Target user:** Casual collectors — people who found old cards and want to know "is this worth anything?" without learning grading jargon.

**Monetization:** Ad-supported via Google AdMob. No upfront cost to users.

---

## Architecture

```
React Native (Expo)
  └── Firebase Cloud Functions (orchestrator)
        ├── Google Gemini API (free tier) — card image analysis & grading
        ├── Pokemon TCG API (free) — card identification & metadata
        └── Pokemon TCG API (built-in prices) + Firestore cache — pricing data
```

**Key infrastructure:**
- **Firebase Auth** — anonymous authentication, zero-friction onboarding
- **Firebase Firestore** — card collection storage, price cache
- **Firebase Storage** — card image storage (kept for saved cards, deleted for unsaved scans after 24hrs via lifecycle rule)
- **Firebase Cloud Functions** — serverless backend orchestrating scan workflow

**Image upload spec:**
- Format: JPEG, compressed to ~80% quality on-device before upload
- Max resolution: 1500px on longest edge (sufficient for grading detail, keeps upload fast)
- Max file size: ~500KB after compression
- Upload path: `scans/{userId}/{timestamp}.jpg`

**Rate limiting:**
- Cloud Function enforces max 10 scans per user per hour via Firestore counter
- Gemini free tier: using **Gemini 2.0 Flash** (15 RPM, 1,500 requests/day free)
- If Gemini quota is exhausted, return a friendly "We're busy right now, try again in a few minutes" message

**Firebase Storage security rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /scans/{userId}/{fileName} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 1 * 1024 * 1024
                   && request.resource.contentType.matches('image/jpeg');
    }
  }
}
```

**Image cleanup:** Orphaned images (unsaved scans) are cleaned up by a scheduled Cloud Function that runs daily, deleting images older than 24 hours that are not referenced by any card document.

---

## Core User Flow

### Screen 1: Camera (Home)
- App opens directly to camera
- Card alignment guide overlay (golden border rectangle)
- Single capture button
- Tab bar at bottom for navigation to Collection

### Screen 2: Analyzing
- Loading screen with progress indicator
- Shows card thumbnail from the captured image
- Text: "Analyzing card... Checking corners, edges, centering & surface"
- Duration: ~3-5 seconds

### Screen 3: Results
- **Card identity:** Name, set, set number, card thumbnail
- **Overall tier:** Simplified grade (e.g., "Near Mint") with estimated PSA range
- **Subgrade grid:** Centering, Corners, Edges, Surface — each scored 1-10
- **Explanation:** Plain English description of what was observed
- **Value estimate:** Raw card value (low/mid/high/market from TCG API)
- **Disclaimer:** "Estimates only — not a substitute for professional grading."
- **Actions:** "Save to Collection" and "Scan Another"
- **Ad placement:** Banner ad at bottom of screen

### Screen 4: Collection
- Grid of saved cards showing thumbnail, name, tier, and value
- Sortable by value, grade, or scan date
- Tap a card to see full results again

### Error States
- **Blurry/bad image:** "We couldn't get a clear read. Try again with better lighting and hold the phone steady."
- **Not a Pokemon card:** "That doesn't look like a Pokemon card. Make sure the full card is in frame."
- **Network error:** "No internet connection. Check your connection and try again."
- **Camera permission denied:** Prompt screen explaining why camera access is needed with a button to open Settings.
- **Gemini quota exceeded:** "We're busy right now. Try again in a few minutes."
- **Card not found in TCG API:** Still show grading results, but note "Card not found in database" — grading works even if identification fails.

### Data Flow Between Screens
- Camera captures image → stores file URI in ScanContext → Analyzing screen reads from context
- Analyzing screen calls the Cloud Function → receives full result JSON
- Result is stored in ScanContext → Results screen reads from context
- "Save to Collection" writes to Firestore from Results screen

---

## Gemini Grading Logic

The Firebase Cloud Function sends the card image to **Gemini 2.0 Flash** (free tier: 15 RPM, 1,500/day) with a structured prompt requesting evaluation across 4 subgrades on a 1-10 scale (half-point increments allowed, e.g., 7.5):

**Known limitations:** Phone cameras cannot reliably capture subtle surface scratches, holo patterns, or fine edge whitening. Grades are estimates, not professional assessments. The app will display a disclaimer: "Estimates only — not a substitute for professional grading." Before launch, test the prompt against 20-30 cards with known PSA grades to calibrate accuracy and adjust the prompt accordingly.

### Gemini Prompt Template
```
System: You are a Pokemon card grading assistant. Analyze the provided card image and evaluate its physical condition. Respond ONLY with valid JSON matching the schema below. Do not hallucinate card details — if you cannot identify the card, set cardName to "Unknown" and setName to "Unknown".

Evaluate these four subgrades on a 1-10 scale (half-point increments allowed):
- centering: How well-centered is the artwork within the card borders?
- corners: Any whitening, bending, or damage at the four corners?
- edges: Any whitening, nicks, or wear along the edges?
- surface: Any scratches, print lines, smudges, or holo scratches?

Determine overallTier from the average of subgrades:
- 9.5-10: "Gem Mint" (PSA 10)
- 8.5-9.4: "Near Mint" (PSA 8-9)
- 7.0-8.4: "Lightly Played" (PSA 5-7)
- 5.0-6.9: "Moderately Played" (PSA 3-4)
- Below 5: "Heavily Played" (PSA 1-2)

Write the explanation in plain English for someone unfamiliar with card grading.
```

Use Gemini's `responseMimeType: "application/json"` and `responseSchema` fields to enforce the JSON structure.

### Subgrades
- **Centering** — how well-centered the artwork is within the borders
- **Corners** — whitening, bending, or damage at the 4 corners
- **Edges** — whitening, nicks, or wear along the edges
- **Surface** — scratches, print lines, smudges, holo scratches

### Gemini Response Format (structured JSON)
```json
{
  "cardName": "Charizard VMAX",
  "setName": "Darkness Ablaze",
  "setNumber": "20/189",
  "centering": 9,
  "corners": 7.5,
  "edges": 8.5,
  "surface": 9,
  "overallTier": "Near Mint",
  "estimatedPSA": "8-9",
  "explanation": "Corners show slight whitening on the top-left. Centering looks good with even borders. Surface is clean with no visible scratches."
}
```

### Tier Mapping
| Average Subgrade | Tier | PSA Estimate |
|-----------------|------|-------------|
| 9.5-10 | Gem Mint | PSA 10 |
| 8.5-9.4 | Near Mint | PSA 8-9 |
| 7.0-8.4 | Lightly Played | PSA 5-7 |
| 5.0-6.9 | Moderately Played | PSA 3-4 |
| Below 5 | Heavily Played | PSA 1-2 |

The **explanation** field provides plain English feedback — no jargon, written for someone who doesn't know grading terminology.

---

## Pricing & Card Data

### Card Identification
- Gemini identifies card name, set, and number from the image
- Verified against the **Pokemon TCG API** (free, no key needed) for official metadata, artwork URL, rarity, and set info

### Pricing Strategy
- **Primary:** The Pokemon TCG API includes TCGPlayer market prices in its card data responses (market, low, mid, high for each condition). Use this as the primary pricing source — it's free, reliable, and legal.
- **Caching:** Store fetched prices in Firestore with a 24-hour TTL — reduces API calls, shared across all users
- **Graded prices:** The TCG API does not include graded card prices. For MVP, show only raw card values. Graded price estimates can be added later via scraping or a data partnership.
- **Fallback:** If the TCG API lookup fails (card not found or API down), show "Price unavailable" — grading still works independently.

### User-Facing Value Display
- **Raw value** — what the card is worth ungraded at the estimated condition
- **Grading cost context** — note that PSA grading starts at ~$20/card for quick mental math on whether grading is worthwhile
- **Graded prices** are out of scope for MVP (TCG API doesn't provide them). Future enhancement.

---

## Data Model (Firestore)

```
users/{userId}
  ├── displayName (optional)
  ├── createdAt
  └── scanCount

users/{userId}/cards/{cardId}
  ├── cardName: string
  ├── setName: string
  ├── setNumber: string
  ├── imageUrl: string (Firebase Storage reference)
  ├── centering: number (1-10, half-point increments)
  ├── corners: number (1-10, half-point increments)
  ├── edges: number (1-10, half-point increments)
  ├── surface: number (1-10, half-point increments)
  ├── overallTier: string
  ├── estimatedPSA: string
  ├── explanation: string
  ├── rawValue: { low: number, mid: number, high: number, market: number }
  ├── pokemonTcgId: string (nullable — null if TCG API lookup fails)
  └── scannedAt: timestamp

priceCache/{pokemonTcgId}
  ├── prices: { low: number, mid: number, high: number, market: number }
  └── fetchedAt: timestamp (24hr TTL)
```

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /cards/{cardId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /priceCache/{cacheId} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions write to cache
    }
  }
}
```

### Key Data Decisions
- **Anonymous auth** — no sign-up required, Firebase assigns anonymous ID. Data is stored server-side in Firestore (not on-device). If the app is reinstalled or cache cleared, the anonymous UID is lost and the collection is gone. This is an acceptable trade-off for MVP simplicity.
- **Card images** stored in Firebase Storage, kept permanently for saved cards. Unsaved scan images are deleted after 24 hours via a Storage lifecycle rule.
- **Price cache** is a top-level collection shared across all users for efficiency. If `pokemonTcgId` is unavailable (TCG API lookup failed), the card is saved without pricing and the price fields are set to null.
- **No user accounts initially** — Google/Apple sign-in can be added later for cross-device sync
- **No collection limit in MVP** — the 20-card limit is a future monetization feature, not enforced in MVP

---

## Ad Integration

### AdMob Placement Strategy
- **Banner ad** on the Results screen — bottom of screen, below action buttons
- **Interstitial ad** every 3rd scan per session (counter resets when app restarts, tracked in local state) — shown between Analyze and Results screens
- **No ads on Camera screen** — keep the core scanning action frictionless

### Implementation
- `react-native-google-mobile-ads` library with Expo config plugin

### Future Monetization (not MVP)
- Remove ads one-time purchase ($2.99)
- Unlimited scan history (free tier keeps last 20 cards)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App Framework | React Native (Expo managed workflow) |
| Navigation | Expo Router (file-based routing) |
| Camera | expo-camera |
| State Management | React Context |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| AI | Google Gemini API (free tier) |
| Card Data | Pokemon TCG API (free) |
| Pricing | Pokemon TCG API (built-in TCGPlayer prices) + Firestore cache |
| Ads | react-native-google-mobile-ads |

---

## Project Structure

```
PokeCard-App/
├── app/                    # Expo Router screens
│   ├── index.tsx           # Camera/scan screen (home)
│   ├── analyzing.tsx       # Loading/progress screen
│   ├── results.tsx         # Grade + value results
│   └── collection.tsx      # Saved cards grid
├── components/             # Reusable UI components
│   ├── CardPreview.tsx
│   ├── GradeDisplay.tsx
│   ├── SubgradeGrid.tsx
│   └── PriceRange.tsx
├── services/               # API & business logic
│   ├── firebase.ts         # Firebase init & helpers
│   ├── scanCard.ts         # Calls cloud function
│   └── collection.ts       # Save/load card operations
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts        # Function entry points
│   │   ├── gemini.ts       # Gemini API integration
│   │   ├── pokemonTcg.ts   # Pokemon TCG API calls
│   │   └── pricing.ts      # Pokemon TCG API pricing + cache
│   └── package.json
├── contexts/               # React Context providers
│   └── ScanContext.tsx
├── assets/                 # Images, fonts
├── app.json                # Expo config
└── firebaseConfig.ts       # Firebase project config
```

---

## Scope / Out of Scope

### In Scope (MVP)
- Camera scan with card alignment guide
- Gemini-powered quality grading (4 subgrades + tier + PSA estimate)
- Card identification via Pokemon TCG API
- Price estimates (raw card values) via Pokemon TCG API with Firestore cache
- Save cards to collection (anonymous auth, Firestore-backed)
- AdMob integration (banner + interstitial)
- iOS and Android support

### Important Disclaimers (MVP)
- Results screen must display: "Estimates only — not a substitute for professional grading."
- Price estimates must note: "Prices are approximate and may not reflect current market value."

### Out of Scope (Future)
- User accounts (Google/Apple sign-in)
- Cross-device sync
- Scan history limit (20 cards) with paid unlock
- Remove-ads purchase
- Social features (sharing, comparing collections)
- Multi-photo scanning (front + back)
- Other TCG support (Magic, Yu-Gi-Oh)
- Push notifications for price changes
- Offline collection viewing
