# PokeGrade App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native (Expo) app that scans Pokemon cards via camera, grades their condition using Gemini AI, and shows estimated market values.

**Architecture:** Expo managed workflow app with Firebase backend (Auth, Firestore, Storage, Cloud Functions). Camera captures a card photo, uploads to Firebase Storage, a Cloud Function sends it to Gemini 2.0 Flash for grading analysis, queries Pokemon TCG API for card data and pricing, returns combined results to the app.

**Tech Stack:** React Native (Expo), Expo Router, expo-camera, Firebase (Auth/Firestore/Storage/Cloud Functions), Google Gemini 2.0 Flash API, Pokemon TCG API, react-native-google-mobile-ads

**Spec:** `docs/superpowers/specs/2026-03-22-pokegrade-app-design.md`

---

## File Structure

```
PokeCard-App/
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root layout with ScanProvider + tab navigation
│   ├── index.tsx                # Camera/scan screen (home tab)
│   ├── analyzing.tsx            # Loading/progress screen
│   ├── results.tsx              # Grade + value results
│   └── collection.tsx           # Saved cards grid (collection tab)
├── components/
│   ├── CardAlignmentGuide.tsx   # Golden border overlay for camera
│   ├── CardPreview.tsx          # Card thumbnail with name/set
│   ├── GradeDisplay.tsx         # Overall tier badge + PSA estimate
│   ├── SubgradeGrid.tsx         # 2x2 grid of centering/corners/edges/surface scores
│   ├── PriceRange.tsx           # Value display (low/mid/high/market)
│   ├── ErrorMessage.tsx         # Reusable error state component
│   └── AdBanner.tsx             # AdMob banner wrapper
├── contexts/
│   └── ScanContext.tsx          # Holds image URI, scan results, scan count for ads
├── services/
│   ├── firebase.ts              # Firebase app init, auth, firestore, storage refs
│   ├── scanCard.ts              # Calls the scanCard Cloud Function
│   └── collection.ts            # Save/load/delete cards from Firestore
├── types/
│   └── index.ts                 # Shared TypeScript types (ScanResult, Card, etc.)
├── functions/                   # Firebase Cloud Functions (Node.js)
│   ├── src/
│   │   ├── index.ts             # Cloud Function entry points (scanCard, cleanupImages)
│   │   ├── gemini.ts            # Gemini API call with prompt + schema
│   │   ├── pokemonTcg.ts        # Pokemon TCG API: card search + price lookup
│   │   └── rateLimit.ts         # Per-user rate limiting via Firestore counter
│   ├── package.json
│   └── tsconfig.json
├── app.json                     # Expo config with AdMob plugin
├── package.json
├── tsconfig.json
├── firestore.rules              # Firestore security rules
├── storage.rules                # Storage security rules
└── firebase.json                # Firebase project config for deploy
```

---

## Task 1: Project Scaffolding & Firebase Setup

**Files:**
- Create: `app.json`, `package.json`, `tsconfig.json`, `firebase.json`, `firestore.rules`, `storage.rules`
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`
- Create: `types/index.ts`

- [ ] **Step 1: Initialize Expo project**

```bash
npx create-expo-app@latest PokeCard-App --template blank-typescript
```

Move contents from the created directory into the current working directory if needed. Then install dependencies:

```bash
npx expo install expo-router expo-camera expo-image-manipulator
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/storage @react-native-firebase/functions
npm install react-native-google-mobile-ads
```

- [ ] **Step 2: Configure app.json**

Update `app.json` with Expo Router scheme, camera permissions, and AdMob plugin:

```json
{
  "expo": {
    "name": "PokeGrade",
    "slug": "pokegrade",
    "version": "1.0.0",
    "scheme": "pokegrade",
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "PokeGrade needs camera access to scan your Pokemon cards."
        }
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy",
          "iosAppId": "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
        }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.pokegrade.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.pokegrade.app",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

- [ ] **Step 3: Create shared TypeScript types**

Create `types/index.ts`:

```typescript
export interface GeminiGradingResult {
  cardName: string;
  setName: string;
  setNumber: string;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  overallTier: string;
  estimatedPSA: string;
  explanation: string;
}

export interface PriceData {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
}

export interface ScanResult {
  grading: GeminiGradingResult;
  price: PriceData | null;
  pokemonTcgId: string | null;
  imageUrl: string;
  storagePath: string;
  cardArtworkUrl: string | null;
}

export interface SavedCard extends ScanResult {
  id: string;
  scannedAt: Date;
}

export type ErrorType =
  | 'blurry_image'
  | 'not_pokemon_card'
  | 'network_error'
  | 'camera_permission_denied'
  | 'quota_exceeded'
  | 'card_not_found'
  | 'unknown';
```

- [ ] **Step 4: Note on Firebase config**

With `@react-native-firebase`, Firebase is configured automatically via `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) — no JavaScript config file is needed. These files will be added in Task 6 when the Firebase project is created. No `firebaseConfig.ts` file is needed.

- [ ] **Step 5: Create Firebase security rules files**

Create `firestore.rules`:

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
      allow write: if false;
    }
    match /rateLimits/{userId} {
      allow read, write: if false;
    }
  }
}
```

Create `storage.rules`:

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

Create `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions"
  }
}
```

- [ ] **Step 6: Initialize Cloud Functions**

```bash
cd functions && npm init -y
npm install firebase-functions firebase-admin @google/generative-ai
npm install -D typescript @types/node
```

Create `functions/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2020"
  },
  "include": ["src"]
}
```

Update `functions/package.json` to add:

```json
{
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "engines": {
    "node": "18"
  }
}
```

Create a placeholder `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';

export const scanCard = functions.https.onCall(async (data, context) => {
  // TODO: implement in Task 3
  return { message: 'not implemented' };
});
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo project with Firebase, types, and security rules"
```

---

## Task 2: ScanContext & Firebase Services

**Files:**
- Create: `contexts/ScanContext.tsx`
- Create: `services/firebase.ts`
- Create: `services/scanCard.ts`
- Create: `services/collection.ts`

- [ ] **Step 1: Create Firebase service**

Create `services/firebase.ts`:

```typescript
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';

export const signInAnonymously = async () => {
  const currentUser = auth().currentUser;
  if (currentUser) return currentUser;
  const { user } = await auth().signInAnonymously();
  await firestore().collection('users').doc(user.uid).set({
    createdAt: firestore.FieldValue.serverTimestamp(),
    scanCount: 0,
  });
  return user;
};

export const getCallable = (name: string) => functions().httpsCallable(name);

export { auth, firestore, storage };
```

- [ ] **Step 2: Create scanCard service**

Create `services/scanCard.ts`:

```typescript
import storage from '@react-native-firebase/storage';
import { getCallable, signInAnonymously } from './firebase';
import { ScanResult, ErrorType } from '../types';
import * as ImageManipulator from 'expo-image-manipulator';

const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1500 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
};

export const scanCard = async (
  imageUri: string
): Promise<{ result?: ScanResult; error?: ErrorType }> => {
  try {
    const user = await signInAnonymously();
    const compressedUri = await compressImage(imageUri);

    const timestamp = Date.now();
    const storagePath = `scans/${user.uid}/${timestamp}.jpg`;
    const ref = storage().ref(storagePath);
    await ref.putFile(compressedUri);
    const downloadUrl = await ref.getDownloadURL();

    const callable = getCallable('scanCard');
    const response = await callable({ imageUrl: downloadUrl, storagePath });
    return { result: response.data as ScanResult };
  } catch (error: any) {
    if (error.code === 'functions/resource-exhausted') {
      return { error: 'quota_exceeded' };
    }
    if (error.code === 'functions/invalid-argument') {
      return { error: 'blurry_image' };
    }
    return { error: 'network_error' };
  }
};
```

- [ ] **Step 3: Create collection service**

Create `services/collection.ts`:

```typescript
import { firestore, signInAnonymously } from './firebase';
import { ScanResult, SavedCard } from '../types';

export const saveCard = async (scanResult: ScanResult): Promise<string> => {
  const user = await signInAnonymously();
  const cardRef = firestore()
    .collection('users')
    .doc(user.uid)
    .collection('cards')
    .doc();

  await cardRef.set({
    ...scanResult.grading,
    imageUrl: scanResult.imageUrl,
    storagePath: scanResult.storagePath,
    cardArtworkUrl: scanResult.cardArtworkUrl,
    pokemonTcgId: scanResult.pokemonTcgId,
    rawValue: scanResult.price,
    scannedAt: firestore.FieldValue.serverTimestamp(),
  });

  await firestore()
    .collection('users')
    .doc(user.uid)
    .update({ scanCount: firestore.FieldValue.increment(1) });

  return cardRef.id;
};

export const getCards = async (): Promise<SavedCard[]> => {
  const user = await signInAnonymously();
  const snapshot = await firestore()
    .collection('users')
    .doc(user.uid)
    .collection('cards')
    .orderBy('scannedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    grading: {
      cardName: doc.data().cardName,
      setName: doc.data().setName,
      setNumber: doc.data().setNumber,
      centering: doc.data().centering,
      corners: doc.data().corners,
      edges: doc.data().edges,
      surface: doc.data().surface,
      overallTier: doc.data().overallTier,
      estimatedPSA: doc.data().estimatedPSA,
      explanation: doc.data().explanation,
    },
    price: doc.data().rawValue,
    pokemonTcgId: doc.data().pokemonTcgId,
    imageUrl: doc.data().imageUrl,
    cardArtworkUrl: doc.data().cardArtworkUrl,
    scannedAt: doc.data().scannedAt?.toDate() ?? new Date(),
  }));
};

export const deleteCard = async (cardId: string): Promise<void> => {
  const user = await signInAnonymously();
  await firestore()
    .collection('users')
    .doc(user.uid)
    .collection('cards')
    .doc(cardId)
    .delete();
};
```

- [ ] **Step 4: Create ScanContext**

Create `contexts/ScanContext.tsx`:

```tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ScanResult, ErrorType } from '../types';

interface ScanContextType {
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  scanResult: ScanResult | null;
  setScanResult: (result: ScanResult | null) => void;
  scanError: ErrorType | null;
  setScanError: (error: ErrorType | null) => void;
  scanCount: number;
  incrementScanCount: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider = ({ children }: { children: ReactNode }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<ErrorType | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const incrementScanCount = () => setScanCount((c) => c + 1);
  const reset = () => {
    setImageUri(null);
    setScanResult(null);
    setScanError(null);
    setIsLoading(false);
  };

  return (
    <ScanContext.Provider
      value={{
        imageUri, setImageUri,
        scanResult, setScanResult,
        scanError, setScanError,
        scanCount, incrementScanCount,
        isLoading, setIsLoading,
        reset,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const context = useContext(ScanContext);
  if (!context) throw new Error('useScan must be used within ScanProvider');
  return context;
};
```

- [ ] **Step 5: Commit**

```bash
git add contexts/ services/
git commit -m "feat: add ScanContext, Firebase services, and collection management"
```

---

## Task 3: Cloud Functions (Gemini + Pokemon TCG API + Rate Limiting)

**Files:**
- Create: `functions/src/gemini.ts`
- Create: `functions/src/pokemonTcg.ts`
- Create: `functions/src/rateLimit.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create rate limiter**

Create `functions/src/rateLimit.ts`:

```typescript
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const checkRateLimit = async (userId: string): Promise<boolean> => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const ref = db.collection('rateLimits').doc(userId);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    const data = doc.data();

    if (!data) {
      transaction.set(ref, { timestamps: [now] });
      return true;
    }

    const recentTimestamps = (data.timestamps as number[]).filter(
      (t) => t > oneHourAgo
    );

    if (recentTimestamps.length >= 10) {
      return false;
    }

    recentTimestamps.push(now);
    transaction.update(ref, { timestamps: recentTimestamps });
    return true;
  });
};
```

- [ ] **Step 2: Create Gemini service**

Create `functions/src/gemini.ts`:

```typescript
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { defineString } from 'firebase-functions/params';

const geminiApiKey = defineString('GEMINI_API_KEY');

const getGenAI = () => new GoogleGenerativeAI(geminiApiKey.value());

const gradingSchema = {
  type: SchemaType.OBJECT,
  properties: {
    cardName: { type: SchemaType.STRING },
    setName: { type: SchemaType.STRING },
    setNumber: { type: SchemaType.STRING },
    centering: { type: SchemaType.NUMBER },
    corners: { type: SchemaType.NUMBER },
    edges: { type: SchemaType.NUMBER },
    surface: { type: SchemaType.NUMBER },
    overallTier: { type: SchemaType.STRING },
    estimatedPSA: { type: SchemaType.STRING },
    explanation: { type: SchemaType.STRING },
  },
  required: [
    'cardName', 'setName', 'setNumber',
    'centering', 'corners', 'edges', 'surface',
    'overallTier', 'estimatedPSA', 'explanation',
  ],
};

const SYSTEM_PROMPT = `You are a Pokemon card grading assistant. Analyze the provided card image and evaluate its physical condition. Respond ONLY with valid JSON matching the schema below. Do not hallucinate card details — if you cannot identify the card, set cardName to "Unknown" and setName to "Unknown".

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

Write the explanation in plain English for someone unfamiliar with card grading.`;

export interface GradingResult {
  cardName: string;
  setName: string;
  setNumber: string;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  overallTier: string;
  estimatedPSA: string;
  explanation: string;
}

export const gradeCard = async (imageUrl: string): Promise<GradingResult> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: gradingSchema,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64Image = imageBuffer.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    },
    'Grade this Pokemon card.',
  ]);

  const text = result.response.text();
  return JSON.parse(text) as GradingResult;
};
```

- [ ] **Step 3: Create Pokemon TCG API service**

Create `functions/src/pokemonTcg.ts`:

```typescript
import * as admin from 'firebase-admin';

const db = admin.firestore();
const TCG_API_BASE = 'https://api.pokemontcg.io/v2';

interface TcgCardData {
  id: string;
  name: string;
  set: { name: string };
  number: string;
  images: { small: string; large: string };
  tcgplayer?: {
    prices?: {
      normal?: { low: number; mid: number; high: number; market: number };
      holofoil?: { low: number; mid: number; high: number; market: number };
      reverseHolofoil?: { low: number; mid: number; high: number; market: number };
    };
  };
}

export interface CardLookupResult {
  pokemonTcgId: string | null;
  cardArtworkUrl: string | null;
  price: { low: number | null; mid: number | null; high: number | null; market: number | null } | null;
}

const getCachedPrice = async (pokemonTcgId: string) => {
  const doc = await db.collection('priceCache').doc(pokemonTcgId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  const fetchedAt = data.fetchedAt?.toDate();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (fetchedAt && fetchedAt > twentyFourHoursAgo) {
    return data.prices;
  }
  return null;
};

const cachePrice = async (
  pokemonTcgId: string,
  prices: { low: number | null; mid: number | null; high: number | null; market: number | null }
) => {
  await db.collection('priceCache').doc(pokemonTcgId).set({
    prices,
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

export const lookupCard = async (
  cardName: string,
  setName: string,
  setNumber: string
): Promise<CardLookupResult> => {
  try {
    const query = encodeURIComponent(
      `name:"${cardName}" set.name:"${setName}" number:"${setNumber}"`
    );
    const response = await fetch(`${TCG_API_BASE}/cards?q=${query}&pageSize=1`);
    const data = (await response.json()) as { data: TcgCardData[] };

    if (!data.data || data.data.length === 0) {
      // Try a broader search with just the card name and set
      const broadQuery = encodeURIComponent(`name:"${cardName}" set.name:"${setName}"`);
      const broadResponse = await fetch(`${TCG_API_BASE}/cards?q=${broadQuery}&pageSize=1`);
      const broadData = (await broadResponse.json()) as { data: TcgCardData[] };

      if (!broadData.data || broadData.data.length === 0) {
        return { pokemonTcgId: null, cardArtworkUrl: null, price: null };
      }
      data.data = broadData.data;
    }

    const card = data.data[0];
    const pokemonTcgId = card.id;

    // Check cache first
    const cachedPrice = await getCachedPrice(pokemonTcgId);
    if (cachedPrice) {
      return {
        pokemonTcgId,
        cardArtworkUrl: card.images.large || card.images.small,
        price: cachedPrice,
      };
    }

    // Extract price from the first available price type
    const priceTypes = card.tcgplayer?.prices;
    const priceData = priceTypes?.holofoil || priceTypes?.normal || priceTypes?.reverseHolofoil;

    const price = priceData
      ? {
          low: priceData.low ?? null,
          mid: priceData.mid ?? null,
          high: priceData.high ?? null,
          market: priceData.market ?? null,
        }
      : null;

    if (price) {
      await cachePrice(pokemonTcgId, price);
    }

    return {
      pokemonTcgId,
      cardArtworkUrl: card.images.large || card.images.small,
      price,
    };
  } catch (error) {
    console.error('Pokemon TCG API lookup failed:', error);
    return { pokemonTcgId: null, cardArtworkUrl: null, price: null };
  }
};
```

- [ ] **Step 4: Wire up the scanCard Cloud Function**

Replace `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { gradeCard } from './gemini';
import { lookupCard } from './pokemonTcg';
import { checkRateLimit } from './rateLimit';

admin.initializeApp();

export const scanCard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;

  // Rate limit check
  const withinLimit = await checkRateLimit(userId);
  if (!withinLimit) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Rate limit exceeded. Try again later.'
    );
  }

  const { imageUrl, storagePath } = data;
  if (!imageUrl || !storagePath) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing imageUrl or storagePath');
  }

  // Grade the card with Gemini
  let grading;
  try {
    grading = await gradeCard(imageUrl);
  } catch (error: any) {
    console.error('Gemini grading failed:', error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        "We're busy right now. Try again in a few minutes."
      );
    }
    throw new functions.https.HttpsError(
      'invalid-argument',
      "We couldn't get a clear read. Try again with better lighting."
    );
  }

  // Look up card data and pricing
  const cardData = await lookupCard(
    grading.cardName,
    grading.setName,
    grading.setNumber
  );

  return {
    grading,
    price: cardData.price,
    pokemonTcgId: cardData.pokemonTcgId,
    imageUrl,
    storagePath,
    cardArtworkUrl: cardData.cardArtworkUrl,
  };
});

// Scheduled cleanup of orphaned images (runs daily)
export const cleanupOrphanedImages = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const bucket = admin.storage().bucket();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [files] = await bucket.getFiles({ prefix: 'scans/' });

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const created = new Date(metadata.timeCreated);

      if (created < oneDayAgo) {
        // Check if any card document references this storage path
        const storagePath = file.name;
        const userId = file.name.split('/')[1];

        const cardsSnapshot = await admin
          .firestore()
          .collection('users')
          .doc(userId)
          .collection('cards')
          .where('storagePath', '==', storagePath)
          .limit(1)
          .get();

        if (cardsSnapshot.empty) {
          await file.delete();
          console.log(`Deleted orphaned image: ${file.name}`);
        }
      }
    }
  });
```

- [ ] **Step 5: Set Gemini API key as Firebase environment config**

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Enter your Gemini API key when prompted.

- [ ] **Step 6: Commit**

```bash
cd /Users/kari/Documents/PokeCard-App
git add functions/
git commit -m "feat: add Cloud Functions for card scanning, grading, pricing, and cleanup"
```

---

## Task 4: UI Components

**Files:**
- Create: `components/CardAlignmentGuide.tsx`
- Create: `components/CardPreview.tsx`
- Create: `components/GradeDisplay.tsx`
- Create: `components/SubgradeGrid.tsx`
- Create: `components/PriceRange.tsx`
- Create: `components/ErrorMessage.tsx`
- Create: `components/AdBanner.tsx`

- [ ] **Step 1: Create CardAlignmentGuide**

Create `components/CardAlignmentGuide.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const CARD_RATIO = 3.5 / 2.5; // Standard Pokemon card ratio
const GUIDE_WIDTH = screenWidth * 0.7;
const GUIDE_HEIGHT = GUIDE_WIDTH * CARD_RATIO;

export const CardAlignmentGuide = () => (
  <View style={styles.container} pointerEvents="none">
    <View style={styles.guide}>
      {/* Corner brackets */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  </View>
);

const CORNER_SIZE = 24;
const CORNER_BORDER = 3;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    width: GUIDE_WIDTH,
    height: GUIDE_HEIGHT,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderStyle: 'dashed',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderColor: '#FFD700',
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -1,
    right: -1,
    borderTopWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderColor: '#FFD700',
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderColor: '#FFD700',
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderColor: '#FFD700',
    borderBottomRightRadius: 12,
  },
});
```

- [ ] **Step 2: Create GradeDisplay**

Create `components/GradeDisplay.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TIER_COLORS: Record<string, string> = {
  'Gem Mint': '#22c55e',
  'Near Mint': '#4ade80',
  'Lightly Played': '#facc15',
  'Moderately Played': '#f97316',
  'Heavily Played': '#ef4444',
};

interface Props {
  tier: string;
  estimatedPSA: string;
}

export const GradeDisplay = ({ tier, estimatedPSA }: Props) => {
  const color = TIER_COLORS[tier] || '#888';

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <Text style={[styles.tier, { color }]}>{tier}</Text>
      <Text style={styles.psa}>Est. PSA {estimatedPSA}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  tier: {
    fontSize: 24,
    fontWeight: '700',
  },
  psa: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
});
```

- [ ] **Step 3: Create SubgradeGrid**

Create `components/SubgradeGrid.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
}

const getScoreColor = (score: number): string => {
  if (score >= 9) return '#22c55e';
  if (score >= 7) return '#facc15';
  if (score >= 5) return '#f97316';
  return '#ef4444';
};

const SubgradeCell = ({ label, score }: { label: string; score: number }) => (
  <View style={styles.cell}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.score, { color: getScoreColor(score) }]}>{score}</Text>
  </View>
);

export const SubgradeGrid = ({ centering, corners, edges, surface }: Props) => (
  <View style={styles.grid}>
    <SubgradeCell label="CENTERING" score={centering} />
    <SubgradeCell label="CORNERS" score={corners} />
    <SubgradeCell label="EDGES" score={edges} />
    <SubgradeCell label="SURFACE" score={surface} />
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(0, 100, 0, 0.15)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  score: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
});
```

- [ ] **Step 4: Create PriceRange, CardPreview, ErrorMessage, and AdBanner**

Create `components/PriceRange.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PriceData } from '../types';

interface Props {
  price: PriceData | null;
}

export const PriceRange = ({ price }: Props) => {
  if (!price || (!price.low && !price.market)) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>ESTIMATED VALUE</Text>
        <Text style={styles.unavailable}>Price unavailable</Text>
        <Text style={styles.hint}>Check TCGPlayer for current pricing</Text>
      </View>
    );
  }

  const marketPrice = price.market ? `$${price.market.toFixed(2)}` : 'N/A';
  const range =
    price.low && price.high
      ? `$${price.low.toFixed(2)} - $${price.high.toFixed(2)}`
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ESTIMATED VALUE</Text>
      <Text style={styles.market}>{marketPrice}</Text>
      {range && <Text style={styles.range}>Range: {range}</Text>}
      <Text style={styles.gradingNote}>PSA grading starts at ~$20/card</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  market: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  range: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  gradingNote: {
    color: '#666',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  unavailable: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  hint: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
});
```

Create `components/CardPreview.tsx`:

```tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  cardName: string;
  setName: string;
  setNumber: string;
  imageUrl?: string | null;
}

export const CardPreview = ({ cardName, setName, setNumber, imageUrl }: Props) => (
  <View style={styles.container}>
    {imageUrl ? (
      <Image source={{ uri: imageUrl }} style={styles.image} />
    ) : (
      <View style={[styles.image, styles.placeholder]}>
        <Text style={styles.placeholderText}>?</Text>
      </View>
    )}
    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={1}>{cardName}</Text>
      <Text style={styles.set}>{setName} #{setNumber}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 60,
    height: 84,
    borderRadius: 6,
  },
  placeholder: {
    backgroundColor: '#1a3a5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#888',
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  set: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
});
```

Create `components/ErrorMessage.tsx`:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ErrorType } from '../types';

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string }> = {
  blurry_image: {
    title: 'Unclear Image',
    message: "We couldn't get a clear read. Try again with better lighting and hold the phone steady.",
  },
  not_pokemon_card: {
    title: 'Not Recognized',
    message: "That doesn't look like a Pokemon card. Make sure the full card is in frame.",
  },
  network_error: {
    title: 'No Connection',
    message: 'No internet connection. Check your connection and try again.',
  },
  camera_permission_denied: {
    title: 'Camera Access Needed',
    message: 'PokeGrade needs camera access to scan your cards. Please enable it in Settings.',
  },
  quota_exceeded: {
    title: 'Too Busy',
    message: "We're busy right now. Try again in a few minutes.",
  },
  card_not_found: {
    title: 'Card Not Found',
    message: 'Card not found in database. Grading results are still shown.',
  },
  unknown: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
};

interface Props {
  errorType: ErrorType;
  onRetry: () => void;
}

export const ErrorMessage = ({ errorType, onRetry }: Props) => {
  const { title, message } = ERROR_MESSAGES[errorType];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
```

Create `components/AdBanner.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__ ? TestIds.BANNER : 'YOUR_PRODUCTION_AD_UNIT_ID';

export const AdBanner = () => (
  <View style={styles.container}>
    <BannerAd
      unitId={AD_UNIT_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add components/
git commit -m "feat: add UI components for grading display, pricing, cards, errors, and ads"
```

---

## Task 5: App Screens & Navigation

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `app/analyzing.tsx`
- Create: `app/results.tsx`
- Create: `app/collection.tsx`

- [ ] **Step 1: Create root layout with tabs and ScanProvider**

Create `app/_layout.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { ScanProvider } from '../contexts/ScanContext';

const TabIcon = ({ name, color }: { name: string; color: string }) => {
  const icons: Record<string, string> = { camera: '📷', grid: '📋' };
  return <Text style={{ fontSize: 20, color }}>{icons[name] || '?'}</Text>;
};

export default function RootLayout() {
  return (
    <ScanProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0d0d1a',
            borderTopColor: '#1a1a2e',
          },
          tabBarActiveTintColor: '#FFD700',
          tabBarInactiveTintColor: '#666',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color }) => <TabIcon name="camera" color={color} />,
          }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: 'Collection',
            tabBarIcon: ({ color }) => <TabIcon name="grid" color={color} />,
          }}
        />
        <Tabs.Screen name="analyzing" options={{ href: null }} />
        <Tabs.Screen name="results" options={{ href: null }} />
      </Tabs>
    </ScanProvider>
  );
}
```

- [ ] **Step 2: Create Camera screen (home)**

Create `app/index.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useScan } from '../contexts/ScanContext';
import { CardAlignmentGuide } from '../components/CardAlignmentGuide';
import { ErrorMessage } from '../components/ErrorMessage';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const router = useRouter();
  const { setImageUri, reset } = useScan();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <ErrorMessage
        errorType="camera_permission_denied"
        onRetry={() => {
          if (permission.canAskAgain) {
            requestPermission();
          } else {
            Linking.openSettings();
          }
        }}
      />
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        reset();
        setImageUri(photo.uri);
        router.push('/analyzing');
      }
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <CardAlignmentGuide />

        <View style={styles.header}>
          <Text style={styles.title}>PokeGrade</Text>
          <Text style={styles.subtitle}>Align your card and tap to scan</Text>
        </View>

        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={capturing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  captureContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#0d0d1a',
  },
});
```

- [ ] **Step 3: Create Analyzing screen**

Create `app/analyzing.tsx`:

```tsx
import React, { useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useScan } from '../contexts/ScanContext';
import { scanCard } from '../services/scanCard';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : 'YOUR_PRODUCTION_INTERSTITIAL_ID';

export default function AnalyzingScreen() {
  const router = useRouter();
  const {
    imageUri,
    setScanResult,
    setScanError,
    scanCount,
    incrementScanCount,
  } = useScan();

  useEffect(() => {
    if (!imageUri) {
      router.replace('/');
      return;
    }

    const analyze = async () => {
      // Show interstitial every 3rd scan
      if (scanCount > 0 && scanCount % 3 === 0) {
        try {
          const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId);
          await new Promise<void>((resolve) => {
            interstitial.addAdEventListener(AdEventType.LOADED, () => {
              interstitial.show();
            });
            interstitial.addAdEventListener(AdEventType.CLOSED, () => {
              resolve();
            });
            interstitial.addAdEventListener(AdEventType.ERROR, () => {
              resolve(); // Don't block on ad failure
            });
            interstitial.load();
            // Timeout after 5 seconds if ad doesn't load
            setTimeout(resolve, 5000);
          });
        } catch {
          // Ad failure shouldn't block scanning
        }
      }

      const { result, error } = await scanCard(imageUri);
      incrementScanCount();

      if (error) {
        setScanError(error);
      }
      if (result) {
        setScanResult(result);
      }
      router.replace('/results');
    };

    analyze();
  }, [imageUri]);

  return (
    <View style={styles.container}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.thumbnail} />
      )}
      <ActivityIndicator size="large" color="#FFD700" style={styles.spinner} />
      <Text style={styles.title}>Analyzing card...</Text>
      <Text style={styles.subtitle}>
        Checking corners, edges, centering & surface
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  thumbnail: {
    width: 120,
    height: 168,
    borderRadius: 8,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Create Results screen**

Create `app/results.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useScan } from '../contexts/ScanContext';
import { CardPreview } from '../components/CardPreview';
import { GradeDisplay } from '../components/GradeDisplay';
import { SubgradeGrid } from '../components/SubgradeGrid';
import { PriceRange } from '../components/PriceRange';
import { ErrorMessage } from '../components/ErrorMessage';
import { AdBanner } from '../components/AdBanner';
import { saveCard } from '../services/collection';

export default function ResultsScreen() {
  const router = useRouter();
  const { scanResult, scanError, reset } = useScan();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (scanError && scanError !== 'card_not_found') {
    return (
      <ErrorMessage
        errorType={scanError}
        onRetry={() => {
          reset();
          router.replace('/');
        }}
      />
    );
  }

  if (!scanResult) {
    return (
      <ErrorMessage
        errorType="unknown"
        onRetry={() => {
          reset();
          router.replace('/');
        }}
      />
    );
  }

  const { grading, price, cardArtworkUrl } = scanResult;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCard(scanResult);
      setSaved(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleScanAnother = () => {
    reset();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <CardPreview
          cardName={grading.cardName}
          setName={grading.setName}
          setNumber={grading.setNumber}
          imageUrl={cardArtworkUrl}
        />

        {scanError === 'card_not_found' && (
          <Text style={styles.warning}>Card not found in database</Text>
        )}

        <GradeDisplay tier={grading.overallTier} estimatedPSA={grading.estimatedPSA} />

        <SubgradeGrid
          centering={grading.centering}
          corners={grading.corners}
          edges={grading.edges}
          surface={grading.surface}
        />

        <View style={styles.explanationBox}>
          <Text style={styles.explanation}>{grading.explanation}</Text>
        </View>

        <PriceRange price={price} />

        <Text style={styles.disclaimer}>
          Estimates only — not a substitute for professional grading. Prices are approximate and may not reflect current market value.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, saved && styles.savedButton]}
            onPress={handleSave}
            disabled={saving || saved}
          >
            <Text style={styles.saveButtonText}>
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save to Collection'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanAnother}>
            <Text style={styles.scanButtonText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  warning: {
    color: '#facc15',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  explanationBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  explanation: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  savedButton: {
    backgroundColor: '#22c55e',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  scanButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
```

- [ ] **Step 5: Create Collection screen**

Create `app/collection.tsx`:

```tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCards } from '../services/collection';
import { SavedCard } from '../types';
import { useScan } from '../contexts/ScanContext';

type SortKey = 'date' | 'grade' | 'value';

const TIER_ORDER: Record<string, number> = {
  'Gem Mint': 5,
  'Near Mint': 4,
  'Lightly Played': 3,
  'Moderately Played': 2,
  'Heavily Played': 1,
};

export default function CollectionScreen() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { setScanResult, setScanError } = useScan();

  const loadCards = useCallback(async () => {
    try {
      const fetchedCards = await getCards();
      setCards(fetchedCards);
    } catch (error) {
      console.error('Failed to load collection:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCards();
    setRefreshing(false);
  };

  const sortedCards = [...cards].sort((a, b) => {
    switch (sortBy) {
      case 'grade':
        return (TIER_ORDER[b.grading.overallTier] || 0) - (TIER_ORDER[a.grading.overallTier] || 0);
      case 'value':
        return (b.price?.market || 0) - (a.price?.market || 0);
      case 'date':
      default:
        return b.scannedAt.getTime() - a.scannedAt.getTime();
    }
  });

  const handleCardPress = (card: SavedCard) => {
    setScanResult({
      grading: card.grading,
      price: card.price,
      pokemonTcgId: card.pokemonTcgId,
      imageUrl: card.imageUrl,
      cardArtworkUrl: card.cardArtworkUrl,
    });
    setScanError(null);
    router.push('/results');
  };

  const renderCard = ({ item }: { item: SavedCard }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleCardPress(item)}>
      {item.cardArtworkUrl ? (
        <Image source={{ uri: item.cardArtworkUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder]}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}
      <Text style={styles.cardName} numberOfLines={1}>{item.grading.cardName}</Text>
      <Text style={styles.cardTier}>{item.grading.overallTier}</Text>
      {item.price?.market && (
        <Text style={styles.cardPrice}>${item.price.market.toFixed(2)}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <Text style={styles.count}>{cards.length} cards</Text>
      </View>

      <View style={styles.sortBar}>
        {(['date', 'grade', 'value'] as SortKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.sortButton, sortBy === key && styles.sortButtonActive]}
            onPress={() => setSortBy(key)}
          >
            <Text
              style={[styles.sortText, sortBy === key && styles.sortTextActive]}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyMessage}>Scan a card and save it to start your collection</Text>
        </View>
      ) : (
        <FlatList
          data={sortedCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFD700" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  count: {
    color: '#888',
    fontSize: 14,
  },
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
  },
  sortButtonActive: {
    backgroundColor: '#FFD700',
  },
  sortText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  sortTextActive: {
    color: '#000',
  },
  grid: {
    paddingHorizontal: 16,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2.5 / 3.5,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardPlaceholder: {
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#333',
    fontSize: 32,
  },
  cardName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cardTier: {
    color: '#4ade80',
    fontSize: 11,
    marginTop: 2,
  },
  cardPrice: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "feat: add all app screens — camera, analyzing, results, and collection"
```

---

## Task 6: Firebase Project Setup & Deploy

**Files:** None (external configuration)

- [ ] **Step 1: Create Firebase project**

```bash
npm install -g firebase-tools
firebase login
firebase projects:create pokegrade-app --display-name "PokeGrade"
firebase use pokegrade-app
```

- [ ] **Step 2: Enable Firebase services**

From the Firebase Console (console.firebase.google.com):
1. Enable **Authentication** → Sign-in method → Anonymous
2. Create **Firestore Database** in production mode
3. Enable **Storage**
4. Add iOS and Android apps, download `GoogleService-Info.plist` and `google-services.json` to project root

- [ ] **Step 3: Deploy security rules and Cloud Functions**

```bash
firebase deploy --only firestore:rules,storage:rules
cd functions && npm run build && cd ..
firebase deploy --only functions
```

- [ ] **Step 4: Update config files with real values**

Update `app.json` with your real AdMob app IDs (or keep test IDs for development). Ensure `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) are in the project root.

- [ ] **Step 5: Set up Gemini API key**

Get a free API key from Google AI Studio (aistudio.google.com):

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

- [ ] **Step 6: Commit config updates**

```bash
git add app.json GoogleService-Info.plist google-services.json
git commit -m "feat: configure Firebase project with real credentials"
```

---

## Task 7: Build & Test on Device

- [ ] **Step 1: Install Expo dev client dependencies**

```bash
npx expo install expo-dev-client
```

- [ ] **Step 2: Build and run on iOS simulator**

```bash
npx expo run:ios
```

- [ ] **Step 3: Test the full scan flow**

1. Open app — verify camera opens with alignment guide
2. Take a photo of a Pokemon card
3. Verify analyzing screen shows with loading state
4. Verify results appear with grade, subgrades, explanation, and price
5. Tap "Save to Collection" — verify it saves
6. Switch to Collection tab — verify card appears
7. Tap the card — verify full results show again

- [ ] **Step 4: Test error states**

1. Take a photo of something that isn't a Pokemon card — verify error message
2. Turn off network — verify network error message
3. Verify interstitial ad appears on every 3rd scan

- [ ] **Step 5: Fix any issues found during testing and commit**

```bash
git add -A
git commit -m "fix: resolve issues found during device testing"
```
