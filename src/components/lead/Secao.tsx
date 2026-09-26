import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from '../ui/Texto';

export function Secao({ titulo, icone, children, direita }: { titulo: string; icone: NomeIcone; children: ReactNode; direita?: ReactNode }) {
  const t = useTema();
  return (
    <View style={[styles.secao, { backgroundColor: t.superficie, borderColor: t.borda }]}>
      <View style={styles.cabeca}>
        <MaterialCommunityIcons name={icone} size={17} color={t.destaque} />
        <Texto variante="rotulo" suave style={{ flex: 1 }}>
          {titulo}
        </Texto>
        {direita}
      </View>
      {children}
    </View>
  );
}

export function LinhaInfo({ rotulo, valor, mono, destaque }: { rotulo: string; valor: string; mono?: boolean; destaque?: string }) {
  const t = useTema();
  return (
    <View style={[styles.linha, { borderTopColor: t.borda }]}>
      <Texto variante="legenda" suave style={styles.rotulo}>
        {rotulo}
      </Texto>
      <Texto
        variante="corpoForte"
        cor={destaque}
        style={[styles.valor, mono && { fontVariant: ['tabular-nums'], letterSpacing: 0.6 }]}
        numberOfLines={2}
        selectable
      >
        {valor}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    marginHorizontal: espaco.lg,
    marginTop: espaco.md,
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.md,
    paddingBottom: espaco.sm,
  },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginBottom: espaco.xs },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rotulo: { flexShrink: 0 },
  valor: { flex: 1, textAlign: 'right' },
});
