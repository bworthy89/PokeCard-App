import * as admin from 'firebase-admin';

const getDb = () => admin.firestore();
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
  const db = getDb();
  const doc = await db.collection('priceCache').doc(pokemonTcgId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  const fetchedAt = data.fetchedAt?.toDate();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (fetchedAt && fetchedAt > twentyFourHoursAgo) return data.prices;
  return null;
};

const cachePrice = async (
  pokemonTcgId: string,
  prices: { low: number | null; mid: number | null; high: number | null; market: number | null }
) => {
  const db = getDb();
  await db.collection('priceCache').doc(pokemonTcgId).set({
    prices,
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const tcgFetch = async (query: string): Promise<TcgCardData[]> => {
  const url = new URL(`${TCG_API_BASE}/cards`);
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', '1');
  console.log(`TCG fetch: ${url.toString()}`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`TCG API error: ${response.status} ${response.statusText}`);
    return [];
  }
  const json = (await response.json()) as { data?: TcgCardData[] };
  return json.data ?? [];
};

export const lookupCard = async (
  cardName: string,
  setName: string,
  setNumber: string
): Promise<CardLookupResult> => {
  try {
    console.log(`TCG lookup: name="${cardName}" set="${setName}" number="${setNumber}"`);

    // Try exact match first
    let cards = await tcgFetch(`name:"${cardName}" set.name:"${setName}" number:"${setNumber}"`);
    console.log(`TCG exact match: ${cards.length}`);

    if (cards.length === 0) {
      // Try without set number
      cards = await tcgFetch(`name:"${cardName}" set.name:"${setName}"`);
      console.log(`TCG name+set match: ${cards.length}`);
    }

    if (cards.length === 0) {
      // Try with just the card name
      cards = await tcgFetch(`name:"${cardName}"`);
      console.log(`TCG name-only match: ${cards.length}`);
    }

    if (cards.length === 0) {
      return { pokemonTcgId: null, cardArtworkUrl: null, price: null };
    }

    const data = { data: cards };

    const card = data.data[0];
    const pokemonTcgId = card.id;
    const cachedPrice = await getCachedPrice(pokemonTcgId);
    if (cachedPrice) {
      return { pokemonTcgId, cardArtworkUrl: card.images.large || card.images.small, price: cachedPrice };
    }

    const priceTypes = card.tcgplayer?.prices;
    const priceData = priceTypes?.holofoil || priceTypes?.normal || priceTypes?.reverseHolofoil;
    const price = priceData
      ? { low: priceData.low ?? null, mid: priceData.mid ?? null, high: priceData.high ?? null, market: priceData.market ?? null }
      : null;

    if (price) await cachePrice(pokemonTcgId, price);

    return { pokemonTcgId, cardArtworkUrl: card.images.large || card.images.small, price };
  } catch (error) {
    console.error('Pokemon TCG API lookup failed:', error);
    return { pokemonTcgId: null, cardArtworkUrl: null, price: null };
  }
};
