import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from './Texto';

type Tom = 'info' | 'alerta' | 'perigo' | 'sucesso';

interface Props {
  tom?: Tom;
  icone?: NomeIcone;
  texto: string;
  acao?: { titulo: string; onPress: () => void };
}

export function Aviso({ tom = 'info', icone, texto, acao }: Props) {
  const t = useTema();
  const cor = { info: t.destaque, alerta: t.atencao, perigo: t.perigo, sucesso: t.sucesso }[tom];
  const padrao: Record<Tom, NomeIcone> = { info: 'information-outline', alerta: 'wifi-off', perigo: 'alert-circle-outline', sucesso: 'check-circle-outline' };
  return (
    <View style={[styles.aviso, { borderColor: cor, backgroundColor: t.superficie }]} accessibilityRole="alert">
      <View style={[styles.barra, { backgroundColor: cor }]} />
      <MaterialCommunityIcons name={icone ?? padrao[tom]} size={18} color={cor} />
      <Texto variante="legenda" style={styles.texto}>
        {texto}
      </Texto>
      {acao ? (
        <Pressable onPress={acao.onPress} hitSlop={8}>
          <Texto variante="legenda" cor={cor} style={{ fontWeight: '700' }}>
            {acao.titulo}
          </Texto>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingVertical: 10,
    paddingRight: espaco.md,
    paddingLeft: espaco.lg,
    borderRadius: raio.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  texto: { flex: 1 },
});
