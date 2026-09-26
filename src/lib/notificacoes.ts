import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const CANAL_CRITICOS = 'leads-criticos';
const CANAL_ACOES = 'acoes';

let preparado = false;

export async function prepararNotificacoes(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!preparado) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      // no android 13+ o pedido de permissão só aparece depois que existe um canal
      await Notifications.setNotificationChannelAsync(CANAL_CRITICOS, {
        name: 'Leads críticos',
        description: 'Cliente classificado com risco crítico de abandono',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 180, 120, 180],
        lightColor: '#E0242F',
      });
      await Notifications.setNotificationChannelAsync(CANAL_ACOES, {
        name: 'Confirmações',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    preparado = true;
  }
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

export async function avisarLeadCritico(leadId: string, nome: string, veiculo: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lead crítico na carteira',
      body: `${nome} · ${veiculo}. Aborde antes da primeira revisão.`,
      data: { leadId },
      sound: 'default',
    },
    trigger: Platform.OS === 'android' ? { channelId: CANAL_CRITICOS } : null,
  });
}

export async function avisarResumoCriticos(qtd: number): Promise<void> {
  if (Platform.OS === 'web' || qtd <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${qtd} ${qtd === 1 ? 'lead crítico' : 'leads críticos'} em aberto`,
      body: 'Os clientes com maior risco de abandono estão no topo da lista.',
      data: { rota: 'leads' },
      sound: 'default',
    },
    trigger: Platform.OS === 'android' ? { channelId: CANAL_CRITICOS } : null,
  });
}

export async function avisarResultado(nome: string, statusLabel: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Resultado registrado',
      body: `${nome}: ${statusLabel}.`,
    },
    trigger: Platform.OS === 'android' ? { channelId: CANAL_ACOES } : null,
  });
}
