import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import {
  corPerfil,
  corPrioridade,
  corStatus,
  PERFIL_ICONE,
  PERFIL_LABEL,
  PRIORIDADE_ICONE,
  PRIORIDADE_LABEL,
  STATUS_ICONE,
  STATUS_LABEL,
} from '@/constants/dominio';
import { fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { PerfilCliente, PrioridadeLead, StatusLead } from '@/types/api';
import { Texto } from '../ui/Texto';

// hex + alfa em 2 dígitos; o fundo das tags é a cor da luz-espia bem diluída
function alfa(hex: string, a: number): string {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

export function TagPrioridade({ prioridade, cheia }: { prioridade: PrioridadeLead; cheia?: boolean }) {
  const t = useTema();
  const cor = corPrioridade(prioridade, t);
  return (
    <View
      style={[styles.tag, { backgroundColor: cheia ? cor : alfa(cor, t.escuro ? 0.2 : 0.12), borderColor: cheia ? cor : alfa(cor, 0.5) }]}
      accessibilityLabel={`Prioridade ${PRIORIDADE_LABEL[prioridade]}`}
    >
      <MaterialCommunityIcons name={PRIORIDADE_ICONE[prioridade]} size={14} color={cheia ? '#fff' : cor} />
      <Texto variante="legenda" cor={cheia ? '#fff' : cor} style={styles.rotuloForte}>
        {PRIORIDADE_LABEL[prioridade]}
      </Texto>
    </View>
  );
}

export function TagPerfil({ perfil }: { perfil: PerfilCliente }) {
  const t = useTema();
  const cor = corPerfil(perfil, t);
  return (
    <View style={[styles.tag, { borderColor: t.borda, backgroundColor: t.superficieAlta }]} accessibilityLabel={`Perfil ${PERFIL_LABEL[perfil]}`}>
      <MaterialCommunityIcons name={PERFIL_ICONE[perfil]} size={14} color={cor} />
      <Texto variante="legenda" style={styles.rotulo}>
        {PERFIL_LABEL[perfil]}
      </Texto>
    </View>
  );
}

export function TagStatus({ status }: { status: StatusLead }) {
  const t = useTema();
  const cor = corStatus(status, t);
  return (
    <View style={[styles.tag, { borderColor: alfa(cor, 0.55), backgroundColor: alfa(cor, t.escuro ? 0.18 : 0.1) }]} accessibilityLabel={`Status ${STATUS_LABEL[status]}`}>
      <MaterialCommunityIcons name={STATUS_ICONE[status]} size={14} color={cor} />
      <Texto variante="legenda" cor={cor} style={styles.rotuloForte}>
        {STATUS_LABEL[status]}
      </Texto>
    </View>
  );
}

export { alfa };

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: raio.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  rotulo: { fontFamily: fonte.condSemi, fontSize: 13.5, letterSpacing: 0.3 },
  rotuloForte: { fontFamily: fonte.condNegrito, fontSize: 13.5, letterSpacing: 0.6, textTransform: 'uppercase' },
});
