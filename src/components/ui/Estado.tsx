import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';
import { espaco } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Botao } from './Botao';
import { Texto } from './Texto';

interface Props {
  icone: NomeIcone;
  titulo: string;
  mensagem?: string;
  acao?: { titulo: string; onPress: () => void; icone?: NomeIcone };
  cor?: string;
}

export function Estado({ icone, titulo, mensagem, acao, cor }: Props) {
  const t = useTema();
  return (
    <View style={styles.box}>
      <View style={[styles.circulo, { borderColor: cor ?? t.bordaForte }]}>
        <MaterialCommunityIcons name={icone} size={34} color={cor ?? t.textoFraco} />
      </View>
      <Texto variante="titulo" centro>
        {titulo}
      </Texto>
      {mensagem ? (
        <Texto suave centro style={{ maxWidth: 300 }}>
          {mensagem}
        </Texto>
      ) : null}
      {acao ? <Botao titulo={acao.titulo} icone={acao.icone} onPress={acao.onPress} variante="secundario" style={{ marginTop: espaco.sm }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', padding: espaco.xxl, gap: espaco.sm, flex: 1 },
  circulo: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: espaco.sm },
});
