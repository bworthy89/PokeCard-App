import * as functions from 'firebase-functions/v1';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { gradeCardFromBase64 } from './gemini';
import { lookupCard } from './pokemonTcg';
import { checkRateLimit } from './rateLimit';

admin.initializeApp();

export const scanCard = functions.runWith({ timeoutSeconds: 300, memory: '1GB' }).https.onCall(async (data, context) => {
  const t0 = Date.now();
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const { imageUrl, storagePath } = data;
  if (!imageUrl || !storagePath) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing imageUrl or storagePath');
  }

  // Run rate limit check and image prefetch in parallel
  const [withinLimit, imageResponse] = await Promise.all([
    checkRateLimit(userId),
    fetch(imageUrl),
  ]);
  console.log(`Rate limit + image fetch: ${Date.now() - t0}ms`);

  if (!withinLimit) {
    throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded. Try again later.');
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64Image = imageBuffer.toString('base64');

  // Grade card with pre-fetched image
  const t1 = Date.now();
  let grading;
  try {
    grading = await gradeCardFromBase64(base64Image);
  } catch (error: any) {
    console.error('Gemini grading failed:', error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new functions.https.HttpsError('resource-exhausted', "We're busy right now. Try again in a few minutes.");
    }
    throw new functions.https.HttpsError('invalid-argument', "We couldn't get a clear read. Try again with better lighting.");
  }
  console.log(`Gemini grading: ${Date.now() - t1}ms`);

  // TCG API lookup
  const t2 = Date.now();
  const cardData = await lookupCard(grading.cardName, grading.setName, grading.setNumber);
  console.log(`TCG API lookup: ${Date.now() - t2}ms`);
  console.log(`Total: ${Date.now() - t0}ms`);

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
