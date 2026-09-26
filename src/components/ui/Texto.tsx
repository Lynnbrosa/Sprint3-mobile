import { Text, type TextProps } from 'react-native';
import { tipografia, type VarianteTexto } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: string;
  suave?: boolean;
  fraco?: boolean;
  centro?: boolean;
}

export function Texto({ variante = 'corpo', cor, suave, fraco, centro, style, ...resto }: Props) {
  const t = useTema();
  const c = cor ?? (fraco ? t.textoFraco : suave ? t.textoSuave : t.texto);
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      style={[tipografia[variante], { color: c }, centro && { textAlign: 'center' }, style]}
      {...resto}
    />
  );
}
