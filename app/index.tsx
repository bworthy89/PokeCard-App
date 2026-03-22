import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useScan } from '../contexts/ScanContext';
import { CardAlignmentGuide } from '../components/CardAlignmentGuide';
import { ErrorMessage } from '../components/ErrorMessage';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const router = useRouter();
  const { setImageUri, reset } = useScan();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <ErrorMessage
        errorType="camera_permission_denied"
        onRetry={() => {
          if (permission.canAskAgain) {
            requestPermission();
          } else {
            Linking.openSettings();
          }
        }}
      />
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        reset();
        setImageUri(photo.uri);
        router.push('/analyzing');
      }
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <CardAlignmentGuide />

        <View style={styles.header}>
          <Text style={styles.title}>PokeGrade</Text>
          <Text style={styles.subtitle}>Align your card and tap to scan</Text>
        </View>

        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={capturing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  captureContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#0d0d1a',
  },
});
