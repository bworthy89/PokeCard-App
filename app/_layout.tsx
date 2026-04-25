import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
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
import { colors } from '../theme';

const TabIcon = ({ name, color }: { name: string; color: string }) => {
  const icons: Record<string, string> = { camera: '📷', grid: '📋' };
  return <Text style={{ fontSize: 20, color }}>{icons[name] || '?'}</Text>;
};

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
          },
          tabBarActiveTintColor: '#FFD23D',
          tabBarInactiveTintColor: colors.ink3,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color }) => <TabIcon name="camera" color={color} />,
          }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: 'Collection',
            tabBarIcon: ({ color }) => <TabIcon name="grid" color={color} />,
          }}
        />
        <Tabs.Screen name="analyzing" options={{ href: null }} />
        <Tabs.Screen name="results" options={{ href: null }} />
      </Tabs>
    </ScanProvider>
  );
}
