import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useScan } from '../contexts/ScanContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { fonts, energy, HOLO_FOIL_COLORS } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const FRAME_W = Math.min(SCREEN_W * 0.78, 320);
const FRAME_H = FRAME_W * (3.5 / 2.5);
const CORNER = 28;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const router = useRouter();
  const { setImageUri, reset } = useScan();

  const scanProgress = useRef(new Animated.Value(0)).current;
  const captureScale = useRef(new Animated.Value(1)).current;
  const captureRing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanProgress, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanProgress]);

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
    Animated.parallel([
      Animated.sequence([
        Animated.timing(captureScale, {
          toValue: 0.85,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(captureScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(captureRing, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        reset();
        setImageUri(photo.uri);
        router.push('/analyzing');
      }
    } finally {
      setCapturing(false);
      captureRing.setValue(0);
    }
  };

  const scanY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [6, FRAME_H - 10],
  });
  const ringScale = captureRing.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const ringOpacity = captureRing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Scanline tint overlay */}
      <View style={styles.scanlineOverlay} pointerEvents="none" />

      {/* Top HUD */}
      <View style={styles.topHud} pointerEvents="box-none">
        <View style={styles.recChip}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>REC</Text>
        </View>
        <View style={styles.hudButton}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 18v3M12 3v3M3 12h3M18 12h3"
              stroke="#fff"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Path
              d="M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              stroke="#fff"
              strokeWidth={2.5}
            />
          </Svg>
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintTitle}>Align card in frame</Text>
        <Text style={styles.hintSub}>Hold steady · good light · all 4 corners visible</Text>
      </View>

      {/* Alignment frame */}
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanY }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', energy.electric.color, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>

      {/* Capture row */}
      <View style={styles.captureRow}>
        <View style={styles.smallButton}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"
              stroke="#fff"
              strokeWidth={2}
            />
          </Svg>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          disabled={capturing}
          onPress={handleCapture}
          style={styles.captureBtnTouch}
        >
          <Animated.View
            style={[
              styles.captureRing,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />
          <View style={styles.captureBorder}>
            <Animated.View style={{ transform: [{ scale: captureScale }] }}>
              <LinearGradient
                colors={HOLO_FOIL_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.captureCore}
              />
            </Animated.View>
          </View>
        </TouchableOpacity>

        <View style={styles.smallButton}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 4l-2 4H6l4 4-2 4 4-2 4 2-2-4 4-4h-4z"
              stroke="#fff"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scanlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 7, 26, 0.18)',
  },
  topHud: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: energy.fire.color,
    shadowColor: energy.fire.color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  recText: {
    color: '#fff',
    fontFamily: fonts.monoBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  hudButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    top: 116,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hintTitle: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  hintSub: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.monoBold,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderRadius: 6,
    borderColor: energy.electric.color,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scanLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    shadowColor: energy.electric.color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  captureRow: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  smallButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnTouch: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: energy.electric.color,
  },
  captureBorder: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureCore: {
    width: 70,
    height: 70,
    borderRadius: 999,
  },
});
