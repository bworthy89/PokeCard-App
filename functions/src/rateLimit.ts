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
