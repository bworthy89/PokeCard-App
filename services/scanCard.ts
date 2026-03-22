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
