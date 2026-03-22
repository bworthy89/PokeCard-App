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
        └── TCGPlayer scraping + Firestore cache — pricing data
```

**Key infrastructure:**
- **Firebase Auth** — anonymous authentication, zero-friction onboarding
- **Firebase Firestore** — card collection storage, price cache
- **Firebase Storage** — temporary card image storage during analysis
- **Firebase Cloud Functions** — serverless backend orchestrating scan workflow

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
- **Value estimate:** Raw value range and graded value range
- **Actions:** "Save to Collection" and "Scan Another"
- **Ad placement:** Banner ad at bottom of screen

### Screen 4: Collection
- Grid of saved cards showing thumbnail, name, tier, and value
- Sortable by value, grade, or scan date
- Tap a card to see full results again

---

## Gemini Grading Logic

The Firebase Cloud Function sends the card image to Gemini with a structured prompt requesting evaluation across 4 subgrades on a 1-10 scale:

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
- **Primary:** Scrape TCGPlayer for pricing at different conditions (NM, LP, MP, HP) and graded prices (PSA 8, 9, 10)
- **Caching:** Store scraped prices in Firestore with a 24-hour TTL — reduces scrape volume, shared across all users
- **Fallback:** If scraping fails, show "Price unavailable — check TCGPlayer" with a direct link

### User-Facing Value Display
- **Raw value** — what the card is worth ungraded at the estimated condition
- **Graded value** — estimated value if they achieved the predicted PSA grade
- **Grading cost context** — note that PSA grading starts at ~$20/card for quick mental math on whether grading is worthwhile

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
  ├── centering: number (1-10)
  ├── corners: number (1-10)
  ├── edges: number (1-10)
  ├── surface: number (1-10)
  ├── overallTier: string
  ├── estimatedPSA: string
  ├── explanation: string
  ├── rawValue: { low: number, high: number }
  ├── gradedValue: { low: number, high: number }
  ├── scannedAt: timestamp
  └── pokemonTcgId: string

priceCache/{pokemonTcgId}
  ├── prices: { nm: number, lp: number, mp: number, hp: number }
  ├── gradedPrices: { psa10: number, psa9: number, psa8: number }
  └── fetchedAt: timestamp (24hr TTL)
```

### Key Data Decisions
- **Anonymous auth** — no sign-up required, Firebase assigns anonymous ID, collection persists on device
- **Card images** stored in Firebase Storage, referenced by URL
- **Price cache** is a top-level collection shared across all users for efficiency
- **No user accounts initially** — Google/Apple sign-in can be added later for cross-device sync

---

## Ad Integration

### AdMob Placement Strategy
- **Banner ad** on the Results screen — bottom of screen, below action buttons
- **Interstitial ad** every 3rd scan — shown between Analyze and Results screens
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
| Pricing | TCGPlayer scraping + Firestore cache |
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
│   │   └── pricing.ts      # TCGPlayer scraping + cache
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
- Price estimates (raw + graded) via TCGPlayer scraping with cache
- Save cards to local collection (anonymous auth)
- AdMob integration (banner + interstitial)
- iOS and Android support

### Out of Scope (Future)
- User accounts (Google/Apple sign-in)
- Cross-device sync
- Scan history beyond 20 cards (free tier limit)
- Remove-ads purchase
- Social features (sharing, comparing collections)
- Multi-photo scanning (front + back)
- Other TCG support (Magic, Yu-Gi-Oh)
- Push notifications for price changes
