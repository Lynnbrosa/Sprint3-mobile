import { StyleSheet, View, type ViewProps } from 'react-native';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';

export function Cartao({ style, ...resto }: ViewProps) {
  const t = useTema();
  return <View style={[styles.cartao, { backgroundColor: t.superficie, borderColor: t.borda }, style]} {...resto} />;
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: espaco.lg,
  },
});
