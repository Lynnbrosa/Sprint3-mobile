import { MaterialCommunityIcons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';
import { espaco, fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from './Texto';

interface Props extends TextInputProps {
  rotulo: string;
  erro?: string | null;
  icone?: NomeIcone;
  dica?: string;
  senha?: boolean;
}

export const Campo = forwardRef<TextInput, Props>(function Campo(
  { rotulo, erro, icone, dica, senha, style, onFocus, onBlur, ...resto },
  ref,
) {
  const t = useTema();
  const [foco, setFoco] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const corBorda = erro ? t.perigo : foco ? t.primaria : t.borda;

  return (
    <View style={styles.bloco}>
      <Texto variante="rotulo" suave>
        {rotulo}
      </Texto>
      <View style={[styles.caixa, { borderColor: corBorda, backgroundColor: t.superficie }, foco && styles.caixaFoco]}>
        {icone ? <MaterialCommunityIcons name={icone} size={20} color={foco ? t.primaria : t.textoFraco} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={t.textoFraco}
          selectionColor={t.primaria}
          secureTextEntry={senha && !visivel}
          accessibilityLabel={rotulo}
          style={[styles.input, { color: t.texto }, style]}
          onFocus={(e) => {
            setFoco(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur?.(e);
          }}
          {...resto}
        />
        {senha ? (
          <Pressable
            onPress={() => setVisivel((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <MaterialCommunityIcons name={visivel ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.textoFraco} />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Texto variante="legenda" cor={t.perigo}>
          {erro}
        </Texto>
      ) : dica ? (
        <Texto variante="legenda" fraco>
          {dica}
        </Texto>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  bloco: { gap: 6 },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    borderWidth: 1,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    minHeight: 50,
  },
  // borda de 2px no foco empurraria o texto; compensa no padding
  caixaFoco: { borderWidth: 2, paddingHorizontal: espaco.md - 1 },
  input: { flex: 1, fontFamily: fonte.media, fontSize: 16, paddingVertical: 10 },
});
