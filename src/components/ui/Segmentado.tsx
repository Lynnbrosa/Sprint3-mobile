import { Pressable, StyleSheet, View } from 'react-native';
import { espaco, fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from './Texto';

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

interface Props<T extends string> {
  opcoes: Opcao<T>[];
  valor: T;
  onChange: (v: T) => void;
  // dentro da faixa escura o segmentado inverte as cores
  sobreFaixa?: boolean;
}

export function Segmentado<T extends string>({ opcoes, valor, onChange, sobreFaixa }: Props<T>) {
  const t = useTema();
  return (
    <View
      style={[
        styles.trilho,
        {
          backgroundColor: sobreFaixa ? 'rgba(255,255,255,0.1)' : t.superficieAlta,
          borderColor: sobreFaixa ? 'rgba(255,255,255,0.14)' : t.borda,
        },
      ]}
      accessibilityRole="tablist"
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        const corTexto = ativo
          ? sobreFaixa
            ? t.faixa
            : t.sobrePrimaria
          : sobreFaixa
            ? 'rgba(255,255,255,0.78)'
            : t.textoSuave;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onChange(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            style={[styles.opcao, ativo && { backgroundColor: sobreFaixa ? '#fff' : t.primaria }]}
          >
            <Texto variante="legenda" cor={corTexto} style={styles.rotulo} numberOfLines={1}>
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { flexDirection: 'row', borderRadius: raio.md, padding: 3, borderWidth: 1 },
  opcao: {
    flex: 1,
    paddingHorizontal: espaco.xs,
    height: 34,
    borderRadius: raio.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotulo: { fontFamily: fonte.condSemi, fontSize: 14, letterSpacing: 0.4, textTransform: 'uppercase' },
});
