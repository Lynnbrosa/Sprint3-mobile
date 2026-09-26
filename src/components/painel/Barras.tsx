import { StyleSheet, View } from 'react-native';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from '../ui/Texto';

export interface Fatia {
  chave: string;
  rotulo: string;
  valor: number;
  cor: string;
}

// barra empilhada + legenda com números: lê melhor que pizza numa tela de 360dp
export function BarraEmpilhada({ fatias }: { fatias: Fatia[] }) {
  const t = useTema();
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return (
    <View style={{ gap: espaco.md }}>
      <View style={[styles.trilho, { backgroundColor: t.trilhaGauge }]} accessibilityElementsHidden>
        {total > 0
          ? fatias
              .filter((f) => f.valor > 0)
              .map((f) => <View key={f.chave} style={{ flex: f.valor, backgroundColor: f.cor }} />)
          : null}
      </View>
      <View style={styles.legenda}>
        {fatias.map((f) => (
          <View key={f.chave} style={styles.item} accessible accessibilityLabel={`${f.rotulo}: ${f.valor}`}>
            <View style={[styles.ponto, { backgroundColor: f.cor }]} />
            <Texto variante="legenda" suave>
              {f.rotulo}
            </Texto>
            <Texto variante="corpoForte" style={styles.num}>
              {f.valor}
            </Texto>
            <Texto variante="legenda" fraco>
              {total ? `${Math.round((f.valor / total) * 100)}%` : '—'}
            </Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

export function BarraLinha({ rotulo, valor, maximo, cor, extra }: { rotulo: string; valor: number; maximo: number; cor: string; extra?: string }) {
  const t = useTema();
  const pct = maximo > 0 ? Math.max(valor > 0 ? 3 : 0, (valor / maximo) * 100) : 0;
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${rotulo}: ${valor}${extra ? `, ${extra}` : ''}`}>
      <View style={styles.linhaTopo}>
        <Texto variante="corpoForte">{rotulo}</Texto>
        <Texto variante="legenda" suave>
          {extra ? `${extra} · ` : ''}
          <Texto variante="corpoForte">{valor}</Texto>
        </Texto>
      </View>
      <View style={[styles.trilhoFino, { backgroundColor: t.trilhaGauge }]}>
        <View style={{ width: `${pct}%`, backgroundColor: cor, borderRadius: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { flexDirection: 'row', height: 16, borderRadius: raio.sm, overflow: 'hidden', gap: 2 },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espaco.sm, columnGap: espaco.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ponto: { width: 10, height: 10, borderRadius: 2 },
  num: { fontVariant: ['tabular-nums'] },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  trilhoFino: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
});
