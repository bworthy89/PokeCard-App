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
    pokemonTypes: scanResult.pokemonTypes ?? null,
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
    storagePath: doc.data().storagePath,
    cardArtworkUrl: doc.data().cardArtworkUrl,
    pokemonTypes: doc.data().pokemonTypes ?? null,
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
