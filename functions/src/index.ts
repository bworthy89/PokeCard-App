import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { gradeCard } from './gemini';
import { lookupCard } from './pokemonTcg';
import { checkRateLimit } from './rateLimit';

admin.initializeApp();

export const scanCard = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const withinLimit = await checkRateLimit(userId);
  if (!withinLimit) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Try again later.');
  }

  const { imageUrl, storagePath } = request.data;
  if (!imageUrl || !storagePath) {
    throw new HttpsError('invalid-argument', 'Missing imageUrl or storagePath');
  }

  // Validate imageUrl points to our Firebase Storage bucket (prevent SSRF)
  const bucketName = admin.storage().bucket().name;
  if (!imageUrl.startsWith(`https://firebasestorage.googleapis.com/v0/b/${bucketName}/`)) {
    throw new HttpsError('invalid-argument', 'Invalid image URL');
  }

  let grading;
  try {
    grading = await gradeCard(imageUrl);
  } catch (error: any) {
    console.error('Gemini grading failed:', error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new HttpsError('resource-exhausted', "We're busy right now. Try again in a few minutes.");
    }
    throw new HttpsError('invalid-argument', "We couldn't get a clear read. Try again with better lighting.");
  }

  const cardData = await lookupCard(grading.cardName, grading.setName, grading.setNumber);

  return {
    grading,
    price: cardData.price,
    pokemonTcgId: cardData.pokemonTcgId,
    imageUrl,
    storagePath,
    cardArtworkUrl: cardData.cardArtworkUrl,
  };
});

export const cleanupOrphanedImages = onSchedule('every 24 hours', async () => {
  const bucket = admin.storage().bucket();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [files] = await bucket.getFiles({ prefix: 'scans/' });

  for (const file of files) {
    try {
      const [metadata] = await file.getMetadata();
      const created = new Date(metadata.timeCreated as string);
      if (created < oneDayAgo) {
        // Path format: scans/{userId}/{filename}
        const storagePath = file.name;
        const userId = file.name.split('/')[1];
        const cardsSnapshot = await admin.firestore()
          .collection('users').doc(userId).collection('cards')
          .where('storagePath', '==', storagePath).limit(1).get();
        if (cardsSnapshot.empty) {
          await file.delete();
          console.log(`Deleted orphaned image: ${file.name}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err);
    }
  }
});
