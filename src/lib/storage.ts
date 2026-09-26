import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// token fica no keystore do android (EncryptedSharedPreferences). no web não existe
// secure store, cai pro localStorage, e isso só serve pra desenvolvimento.
const web = Platform.OS === 'web';

export const Seguro = {
  async ler(chave: string): Promise<string | null> {
    try {
      return web ? await AsyncStorage.getItem(chave) : await SecureStore.getItemAsync(chave);
    } catch {
      return null;
    }
  },
  async gravar(chave: string, valor: string): Promise<void> {
    if (web) await AsyncStorage.setItem(chave, valor);
    else await SecureStore.setItemAsync(chave, valor, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async apagar(chave: string): Promise<void> {
    try {
      if (web) await AsyncStorage.removeItem(chave);
      else await SecureStore.deleteItemAsync(chave);
    } catch {
      // chave que não existe não é erro
    }
  },
};

export const Local = {
  async ler<T>(chave: string): Promise<T | null> {
    try {
      const bruto = await AsyncStorage.getItem(chave);
      return bruto ? (JSON.parse(bruto) as T) : null;
    } catch {
      return null;
    }
  },
  async gravar<T>(chave: string, valor: T): Promise<void> {
    try {
      await AsyncStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      // cache cheio não pode derrubar a tela
    }
  },
  async apagar(chave: string): Promise<void> {
    await AsyncStorage.removeItem(chave);
  },
  async apagarPrefixo(prefixo: string): Promise<void> {
    const chaves = await AsyncStorage.getAllKeys();
    const alvo = chaves.filter((k) => k.startsWith(prefixo));
    if (alvo.length) await AsyncStorage.multiRemove(alvo);
  },
};
