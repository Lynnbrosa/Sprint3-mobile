import { useColorScheme } from 'react-native';
import { useConfig } from '@/store/config';
import { temaClaro, temaEscuro, type Tema } from './tokens';

export function useTema(): Tema {
  const sistema = useColorScheme();
  const pref = useConfig((s) => s.tema);
  const escuro = pref === 'sistema' ? sistema === 'dark' : pref === 'escuro';
  return escuro ? temaEscuro : temaClaro;
}
