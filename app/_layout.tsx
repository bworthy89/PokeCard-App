import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { ScanProvider } from '../contexts/ScanContext';

const TabIcon = ({ name, color }: { name: string; color: string }) => {
  const icons: Record<string, string> = { camera: '📷', grid: '📋' };
  return <Text style={{ fontSize: 20, color }}>{icons[name] || '?'}</Text>;
};

export default function RootLayout() {
  return (
    <ScanProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0d0d1a',
            borderTopColor: '#1a1a2e',
          },
          tabBarActiveTintColor: '#FFD700',
          tabBarInactiveTintColor: '#666',
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
