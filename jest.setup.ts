jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// no jest o módulo nativo do expo-crypto não existe; o sha256 do node dá o mesmo hex.
// factory do jest.mock não enxerga import de fora, por isso o require aqui dentro
jest.mock('expo-crypto', () => {
  const nodeCrypto = require('node:crypto');
  return {
    randomUUID: () => nodeCrypto.randomUUID(),
    digestStringAsync: async (_alg: string, dado: string) => nodeCrypto.createHash('sha256').update(dado, 'utf8').digest('hex'),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { HEX: 'hex' },
  };
});

jest.mock('expo-secure-store', () => {
  const mem = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'x',
    getItemAsync: async (k: string) => mem.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void mem.set(k, v),
    deleteItemAsync: async (k: string) => void mem.delete(k),
  };
});
