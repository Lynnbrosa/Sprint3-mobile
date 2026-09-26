import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { alfa } from '../lead/Tags';
import { Texto } from '../ui/Texto';

interface Props {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone: NomeIcone;
  cor: string;
}

export function Kpi({ rotulo, valor, detalhe, icone, cor }: Props) {
  const t = useTema();
  return (
    <View style={[styles.kpi, { backgroundColor: t.superficie, borderColor: t.borda }]} accessible accessibilityLabel={`${rotulo}: ${valor}${detalhe ? `, ${detalhe}` : ''}`}>
      <View style={styles.topo}>
        <View style={[styles.icone, { backgroundColor: alfa(cor, t.escuro ? 0.22 : 0.12) }]}>
          <MaterialCommunityIcons name={icone} size={18} color={cor} />
        </View>
        <Texto variante="rotulo" suave style={{ flex: 1 }} numberOfLines={1}>
          {rotulo}
        </Texto>
      </View>
      <Texto variante="numeroGrande" cor={cor}>
        {valor}
      </Texto>
      {detalhe ? (
        <Texto variante="legenda" fraco numberOfLines={2}>
          {detalhe}
        </Texto>
      ) : null}
      <View style={[styles.base, { backgroundColor: cor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  kpi: {
    flex: 1,
    minWidth: '46%',
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: espaco.md,
    paddingBottom: espaco.md + 4,
    gap: 4,
    overflow: 'hidden',
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginBottom: 2 },
  icone: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  base: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
});
