import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';
import { fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from './Texto';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icone?: NomeIcone;
  cor?: string; // sobrescreve o fundo do primário (botões de resultado)
  carregando?: boolean;
  desabilitado?: boolean;
  compacto?: boolean;
  // ícone em cima do rótulo: três botões lado a lado cabem em 360dp
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Botao({ titulo, onPress, variante = 'primario', icone, cor, carregando, desabilitado, compacto, vertical, style, testID }: Props) {
  const t = useTema();
  const inativo = desabilitado || carregando;

  const fundo = {
    primario: cor ?? t.primaria,
    secundario: t.superficieAlta,
    fantasma: 'transparent',
    perigo: t.perigo,
  }[variante];
  const texto = variante === 'secundario' || variante === 'fantasma' ? (cor ?? t.texto) : t.sobrePrimaria;
  const borda = variante === 'secundario' ? t.borda : 'transparent';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      accessibilityLabel={titulo}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compacto && styles.compacto,
        { backgroundColor: fundo, borderColor: borda, opacity: inativo ? 0.55 : 1 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.88 },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={texto} />
      ) : (
        <View style={[styles.conteudo, vertical && styles.conteudoVertical]}>
          {icone ? <MaterialCommunityIcons name={icone} size={compacto ? 17 : vertical ? 22 : 20} color={texto} /> : null}
          <Texto variante="corpoForte" cor={texto} style={[styles.rotulo, (compacto || vertical) && { fontSize: 14 }]} numberOfLines={1}>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: raio.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compacto: { minHeight: 40, paddingHorizontal: 12 },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conteudoVertical: { flexDirection: 'column', gap: 2, paddingVertical: 8 },
  rotulo: { fontFamily: fonte.semi, letterSpacing: 0.2 },
});
