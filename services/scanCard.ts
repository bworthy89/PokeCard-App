import storage from '@react-native-firebase/storage';
import { getCallable, signInAnonymously } from './firebase';
import { ScanResult, ErrorType } from '../types';
import * as ImageManipulator from 'expo-image-manipulator';

const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
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
    console.log('scanCard response:', JSON.stringify(response.data));
    return { result: response.data as ScanResult };
  } catch (error: any) {
    console.error('scanCard error:', error.code, error.message, error);
    if (error.code === 'functions/resource-exhausted') {
      return { error: 'quota_exceeded' };
    }
    if (error.code === 'functions/invalid-argument') {
      return { error: 'blurry_image' };
    }
    return { error: 'network_error' };
  }
};
