import '../global.css';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tokenCache } from '../lib/clerk';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { LogBox, View as RNView, Text as RNText } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

// Suprime avisos que não podemos corrigir em dependências (Clerk, NativeWind v4)
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  "Couldn't find a navigation context",
  'Duplicate atom key', // Comum com NativeWind v4 e Hot Reloading
]);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

function AuthGuard() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    console.log('Auth status:', { isSignedIn, isLoaded, inAuthGroup, segment: segments[0] });

    if (isSignedIn && inAuthGroup) {
      // Logged in but in auth pages -> Go to tabs
      console.log('Redirecting to (tabs)');
      router.replace('/(tabs)');
    } else if (!isSignedIn && !inAuthGroup) {
      // Not logged in but not in auth pages -> Go to login
      console.log('Redirecting to (auth)/sign-in');
      router.replace('/(auth)/sign-in');
    }
  }, [isSignedIn, isLoaded, segments]);

  if (!isLoaded) return <RNView style={{ flex: 1, backgroundColor: '#2D5A27' }} />;

  return <Slot />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  const content = (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );

  return (
    <SafeAreaProvider>
      {!publishableKey ? (
        <RNView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <RNView style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <RNText style={{ color: '#991B1B', fontWeight: 'bold', fontSize: 13 }}>⚠️ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY não configurada.</RNText>
          </RNView>
          {content}
        </RNView>
      ) : (
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <ClerkLoaded>
            {content}
          </ClerkLoaded>
        </ClerkProvider>
      )}
    </SafeAreaProvider>
  );
}
