import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/ui/Toast';
import { useAuth } from '@/store/auth';
import { useConfig } from '@/store/config';
import { useTema } from '@/theme/useTema';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 350, fade: true });

// no android/ios as fontes vão embutidas pelo plugin do expo-font; o web precisa carregar
const FONTES_WEB =
  Platform.OS === 'web'
    ? {
        Barlow_400Regular,
        Barlow_500Medium,
        Barlow_600SemiBold,
        Barlow_700Bold,
        BarlowCondensed_500Medium,
        BarlowCondensed_600SemiBold,
        BarlowCondensed_700Bold,
        BarlowCondensed_800ExtraBold,
      }
    : {};

export default function RootLayout() {
  const t = useTema();
  const [fontesProntas] = useFonts(FONTES_WEB);
  const configPronta = useConfig((s) => s.hidratado);
  const situacao = useAuth((s) => s.situacao);

  useEffect(() => {
    (async () => {
      await useConfig.getState().hidratar();
      await useAuth.getState().iniciar();
    })();
  }, []);

  const pronto = fontesProntas && configPronta && situacao !== 'carregando';

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync().catch(() => undefined);
  }, [pronto]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.fundo).catch(() => undefined);
  }, [t.fundo]);

  if (!pronto) return null;

  const logado = situacao === 'logado';

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: t.fundo },
        }}
      >
        <Stack.Protected guard={logado}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!logado}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Screen name="servidor" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <ToastHost />
    </SafeAreaProvider>
  );
}
