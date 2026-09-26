import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { espaco } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Regua } from './Regua';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  sobretitulo?: string;
  subtitulo?: string;
  esquerda?: ReactNode;
  direita?: ReactNode;
  children?: ReactNode;
}

export function Faixa({ titulo, sobretitulo, subtitulo, esquerda, direita, children }: Props) {
  const t = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.faixa, { backgroundColor: t.faixa, paddingTop: insets.top + espaco.md }]}>
      <View style={styles.linha}>
        {esquerda}
        <View style={styles.textos}>
          {sobretitulo ? (
            <Texto variante="rotulo" cor={t.sobreFaixaSuave} numberOfLines={1}>
              {sobretitulo}
            </Texto>
          ) : null}
          <Texto variante="display" cor={t.sobreFaixa} numberOfLines={1} accessibilityRole="header">
            {titulo}
          </Texto>
          {subtitulo ? (
            <Texto variante="legenda" cor={t.sobreFaixaSuave} numberOfLines={2} style={{ marginTop: 2 }}>
              {subtitulo}
            </Texto>
          ) : null}
        </View>
        {direita ? <View style={styles.direita}>{direita}</View> : null}
      </View>
      {children}
      <View style={styles.regua}>
        <Regua />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: { paddingHorizontal: espaco.xl, paddingBottom: espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  textos: { flex: 1 },
  direita: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  regua: { marginTop: espaco.md },
});
