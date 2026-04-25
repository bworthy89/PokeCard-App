import { firestore, signInAnonymously } from './firebase';
import { WishlistItem, WishlistInput } from '../types';

const wishlistRef = (uid: string) =>
  firestore().collection('users').doc(uid).collection('wishlist');

const cleanInput = (input: WishlistInput) => {
  const out: Record<string, unknown> = {
    cardName: input.cardName,
    targetPrice: input.targetPrice,
    alertEnabled: input.alertEnabled ?? false,
    createdAt: firestore.FieldValue.serverTimestamp(),
  };
  if (input.setName !== undefined) out.setName = input.setName;
  if (input.setNumber !== undefined) out.setNumber = input.setNumber;
  if (input.pokemonTcgId !== undefined) out.pokemonTcgId = input.pokemonTcgId;
  if (input.cardArtworkUrl !== undefined) out.cardArtworkUrl = input.cardArtworkUrl;
  if (input.currentPrice !== undefined) out.currentPrice = input.currentPrice;
  return out;
};

export const addWishlistItem = async (input: WishlistInput): Promise<string> => {
  const user = await signInAnonymously();
  const ref = wishlistRef(user.uid).doc();
  await ref.set(cleanInput(input));
  return ref.id;
};

export const getWishlist = async (): Promise<WishlistItem[]> => {
  const user = await signInAnonymously();
  const snap = await wishlistRef(user.uid).orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      cardName: data.cardName,
      setName: data.setName,
      setNumber: data.setNumber,
      pokemonTcgId: data.pokemonTcgId,
      cardArtworkUrl: data.cardArtworkUrl,
      targetPrice: data.targetPrice ?? 0,
      currentPrice: data.currentPrice,
      alertEnabled: data.alertEnabled ?? false,
      createdAt: data.createdAt?.toDate() ?? new Date(),
    };
  });
};

export const deleteWishlistItem = async (id: string): Promise<void> => {
  const user = await signInAnonymously();
  await wishlistRef(user.uid).doc(id).delete();
};

export const updateWishlistItem = async (
  id: string,
  patch: Partial<Pick<WishlistItem, 'targetPrice' | 'currentPrice' | 'alertEnabled'>>
): Promise<void> => {
  const user = await signInAnonymously();
  await wishlistRef(user.uid).doc(id).update(patch);
};
