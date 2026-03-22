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
