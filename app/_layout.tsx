import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  GeistMono_500Medium,
  GeistMono_700Bold,
  GeistMono_800ExtraBold,
} from '@expo-google-fonts/geist-mono';
import { ScanProvider } from '../contexts/ScanContext';
import { colors, fonts, energy } from '../theme';

type IconName = 'home' | 'vault' | 'user';

const TabGlyph = ({ name, color }: { name: IconName; color: string }) => {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <Path
        d="M3 12 12 3l9 9M5 10v10h14V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    vault: (
      <>
        <Path d="M4 6h16v12H4z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M4 10h16M9 6v4M15 6v4" stroke={color} strokeWidth={2} />
      </>
    ),
    user: (
      <>
        <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
        <Path d="M4 21a8 8 0 0116 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {paths[name]}
    </Svg>
  );
};

const TabLabel = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text
    style={{
      fontFamily: fonts.monoBold,
      fontSize: 10,
      fontWeight: '700',
      color: focused ? colors.ink0 : colors.ink3,
      letterSpacing: 0.6,
      marginBottom: 4,
    }}
  >
    {label.toUpperCase()}
  </Text>
);

const ScanTabButton = () => {
  const router = useRouter();
  return (
    <View style={scanStyles.host}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Scan a card"
        activeOpacity={0.85}
        onPress={() => router.push('/scan')}
        style={scanStyles.button}
      >
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"
            stroke="#000"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            stroke="#000"
            strokeWidth={3}
          />
        </Svg>
      </TouchableOpacity>
    </View>
  );
};

const scanStyles = StyleSheet.create({
  host: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: energy.electric.color,
    borderWidth: 3,
    borderColor: colors.bg0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -18 }],
    shadowColor: energy.electric.color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_700Bold,
    GeistMono_500Medium,
    GeistMono_700Bold,
    GeistMono_800ExtraBold,
  });

  useEffect(() => {
    if (fontsError) {
      console.error('[fonts] failed to load, falling back to system fonts:', fontsError);
    }
  }, [fontsError]);

  if (!fontsLoaded && !fontsError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg0 }} />;
  }

  return (
    <ScanProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bg0,
            borderTopColor: colors.bg2,
            height: 80,
            paddingTop: 8,
            paddingBottom: 18,
          },
          tabBarActiveTintColor: colors.ink0,
          tabBarInactiveTintColor: colors.ink3,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: ({ focused }) => <TabLabel label="Home" focused={focused} />,
            tabBarIcon: ({ color }) => <TabGlyph name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarLabel: () => null,
            tabBarButton: () => <ScanTabButton />,
          }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: 'Vault',
            tabBarLabel: ({ focused }) => <TabLabel label="Vault" focused={focused} />,
            tabBarIcon: ({ color }) => <TabGlyph name="vault" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'You',
            tabBarLabel: ({ focused }) => <TabLabel label="You" focused={focused} />,
            tabBarIcon: ({ color }) => <TabGlyph name="user" color={color} />,
          }}
        />
        <Tabs.Screen name="analyzing" options={{ href: null }} />
        <Tabs.Screen name="results" options={{ href: null }} />
        <Tabs.Screen name="wishlist" options={{ href: null }} />
        <Tabs.Screen name="card-detail" options={{ href: null }} />
      </Tabs>
    </ScanProvider>
  );
}
