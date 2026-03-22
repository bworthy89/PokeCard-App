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
  if (fetchedAt && fetchedAt > twentyFourHoursAgo) return data.prices;
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
    const query = encodeURIComponent(`name:"${cardName}" set.name:"${setName}" number:"${setNumber}"`);
    const response = await fetch(`${TCG_API_BASE}/cards?q=${query}&pageSize=1`);
    const data = (await response.json()) as { data: TcgCardData[] };

    if (!data.data || data.data.length === 0) {
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
