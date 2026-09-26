import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { corPrioridade, perfilDoScore } from '@/constants/dominio';
import { haQuanto } from '@/lib/formato';
import { espaco, fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { LeadListItem } from '@/types/api';
import { Texto } from '../ui/Texto';
import { TagPerfil, TagPrioridade, TagStatus } from './Tags';

interface Props {
  lead: LeadListItem;
  onPress: (id: string) => void;
}

function LeadCardBase({ lead, onPress }: Props) {
  const t = useTema();
  const cor = corPrioridade(lead.prioridade, t);
  const perfil = lead.perfil ?? perfilDoScore(lead.scoreRisco);
  const pct = Math.round(lead.scoreRisco * 100);

  return (
    <Pressable
      onPress={() => onPress(lead.id)}
      accessibilityRole="button"
      accessibilityLabel={`${lead.nomeCliente}, ${lead.modeloVeiculo}, risco ${pct} por cento`}
      accessibilityHint="Abre a visão 360 do cliente"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.superficie, borderColor: t.borda },
        pressed && { transform: [{ scale: 0.985 }], backgroundColor: t.superficieAlta },
      ]}
    >
      <View style={[styles.faixaLateral, { backgroundColor: cor }]} />
      <View style={styles.corpo}>
        <View style={styles.topo}>
          <View style={styles.nomeBloco}>
            <Texto variante="subtitulo" numberOfLines={1}>
              {lead.nomeCliente}
            </Texto>
            <View style={styles.veiculo}>
              <MaterialCommunityIcons name="car-side" size={15} color={t.textoFraco} />
              <Texto variante="legenda" suave numberOfLines={1}>
                {lead.modeloVeiculo}
              </Texto>
            </View>
          </View>
          <View style={styles.score}>
            <Texto variante="numero" cor={cor} style={styles.scoreNum}>
              {pct}
              <Texto variante="legenda" cor={cor} style={styles.pct}>
                %
              </Texto>
            </Texto>
            <Texto variante="rotulo" fraco style={styles.scoreRotulo}>
              risco
            </Texto>
          </View>
        </View>

        <View style={[styles.medidor, { backgroundColor: t.trilhaGauge }]}>
          <View style={[styles.medidorCheio, { width: `${pct}%`, backgroundColor: cor }]} />
        </View>

        <View style={styles.rodape}>
          <TagPrioridade prioridade={lead.prioridade} />
          <TagPerfil perfil={perfil} />
          {lead.status !== 'aberto' ? <TagStatus status={lead.status} /> : null}
          <Texto variante="legenda" fraco style={styles.quando} numberOfLines={1}>
            {haQuanto(lead.criadoEm)}
          </Texto>
        </View>
      </View>
    </Pressable>
  );
}

export const LeadCard = memo(LeadCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: espaco.lg,
    marginVertical: 5,
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  faixaLateral: { width: 5 },
  corpo: { flex: 1, padding: espaco.md, paddingLeft: espaco.md + 2, gap: 9 },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  nomeBloco: { flex: 1, gap: 2 },
  veiculo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  score: { alignItems: 'flex-end', minWidth: 56 },
  scoreNum: { fontSize: 30, lineHeight: 31 },
  pct: { fontFamily: fonte.condNegrito, fontSize: 15 },
  scoreRotulo: { fontSize: 10.5, marginTop: -2 },
  medidor: { height: 4, borderRadius: 2, overflow: 'hidden' },
  medidorCheio: { height: 4, borderRadius: 2 },
  rodape: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  quando: { marginLeft: 'auto' },
});
