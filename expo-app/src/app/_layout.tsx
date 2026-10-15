import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const headerOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle: { backgroundColor: colors.bg },
};

function RootNavigator() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="udhaar" options={{ ...headerOptions, title: 'Udhaar Ledger' }} />
        <Stack.Screen name="analytics" options={{ ...headerOptions, title: 'Profit Analytics' }} />
        <Stack.Screen name="mandi" options={{ ...headerOptions, title: 'Mandi & Credit' }} />
        <Stack.Screen name="weather" options={{ ...headerOptions, title: 'Weather & Demand' }} />
        <Stack.Screen name="mobility" options={{ ...headerOptions, title: 'Smart Mobility' }} />
        <Stack.Screen name="profile" options={{ ...headerOptions, title: 'Business Profile' }} />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}
