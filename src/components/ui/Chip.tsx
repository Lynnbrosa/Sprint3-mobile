import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';
import { fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from './Texto';

interface Props {
  rotulo: string;
  ativo?: boolean;
  cor?: string;
  icone?: NomeIcone;
  contagem?: number;
  onPress?: () => void;
  testID?: string;
}

export function Chip({ rotulo, ativo, cor, icone, contagem, onPress, testID }: Props) {
  const t = useTema();
  const destaque = cor ?? t.primaria;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: ativo ? destaque : t.superficie,
          borderColor: ativo ? destaque : t.borda,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {icone ? (
        <MaterialCommunityIcons name={icone} size={15} color={ativo ? '#fff' : destaque} />
      ) : cor ? (
        <View style={[styles.ponto, { backgroundColor: ativo ? '#fff' : cor }]} />
      ) : null}
      <Texto variante="legenda" cor={ativo ? '#fff' : t.texto} style={styles.rotulo}>
        {rotulo}
      </Texto>
      {typeof contagem === 'number' ? (
        <Texto variante="legenda" cor={ativo ? 'rgba(255,255,255,0.8)' : t.textoFraco} style={styles.contagem}>
          {contagem}
        </Texto>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: raio.pill,
    borderWidth: 1,
  },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  rotulo: { fontFamily: fonte.semi, fontSize: 13 },
  contagem: { fontFamily: fonte.condNegrito, fontSize: 14 },
});
