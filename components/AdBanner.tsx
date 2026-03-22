import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__ ? TestIds.BANNER : 'YOUR_PRODUCTION_AD_UNIT_ID';

export const AdBanner = () => (
  <View style={styles.container}>
    <BannerAd unitId={AD_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 4 },
});
