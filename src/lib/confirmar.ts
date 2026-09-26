import { Alert, Platform } from 'react-native';

// Alert.alert com botões não faz nada no react-native-web; lá vai o confirm do navegador
export function confirmar(titulo: string, mensagem: string, rotuloOk: string, aoConfirmar: () => void, destrutivo = false): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${titulo}\n\n${mensagem}`)) aoConfirmar();
    return;
  }
  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: rotuloOk, style: destrutivo ? 'destructive' : 'default', onPress: aoConfirmar },
  ]);
}
