import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { prepararNotificacoes } from '@/lib/notificacoes';
import { useConfig } from '@/store/config';
import { useTema } from '@/theme/useTema';

let ultimoToque: string | null = null;

function useAberturaPorNotificacao() {
  const router = useRouter();
  const notificacoes = useConfig((s) => s.notificacoes);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (notificacoes) prepararNotificacoes().catch(() => undefined);

    const abrir = (r: Notifications.NotificationResponse | null) => {
      const leadId = r?.notification.request.content.data?.leadId;
      const idToque = r?.notification.request.identifier;
      // o efeito roda de novo quando liga/desliga notificação; sem isso reabria o mesmo lead
      if (!idToque || idToque === ultimoToque) return;
      ultimoToque = idToque;
      if (typeof leadId === 'string') router.push({ pathname: '/lead/[id]', params: { id: leadId } });
    };
    // app fechado e aberto pelo toque na notificação
    abrir(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [router, notificacoes]);
}

export default function AppLayout() {
  const t = useTema();
  useAberturaPorNotificacao();

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: t.fundo } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lead/[id]" />
      <Stack.Screen name="registrar/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
