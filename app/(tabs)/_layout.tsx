import React from 'react';
import { Tabs } from 'expo-router';
import { Home, ChartBar, Cloud, Calculator, Sprout } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2D5A27', // primary color
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color }) => <ChartBar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calculadora',
          tabBarIcon: ({ color }) => <Calculator size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="farmer"
        options={{
          title: 'Agricultor',
          tabBarIcon: ({ color }) => <Cloud size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="harvests"
        options={{
          title: 'Safras',
          href: null, // escondido da tab bar - acessado via botão na Home
        }}
      />
    </Tabs>
  );
}
