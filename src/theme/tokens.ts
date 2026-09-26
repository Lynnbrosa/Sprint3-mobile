import type { TextStyle } from 'react-native';

// identidade: painel de instrumentos. azul ford como âncora, faixa vermelha do conta-giros
// como cor de risco, números em condensada como no cluster do carro.
export const marca = {
  azulFord: '#003478',
  azulProfundo: '#001E4A',
  azulNoite: '#070E1C',
  azulSinal: '#2E7DFF',
  vermelhoRisco: '#E0242F',
  branco: '#FFFFFF',
} as const;

export interface Tema {
  escuro: boolean;
  fundo: string;
  superficie: string;
  superficieAlta: string;
  borda: string;
  bordaForte: string;
  texto: string;
  textoSuave: string;
  textoFraco: string;
  primaria: string;
  sobrePrimaria: string;
  destaque: string;
  faixa: string; // banda escura do topo das telas
  sobreFaixa: string;
  sobreFaixaSuave: string;
  perigo: string;
  alerta: string;
  atencao: string;
  sucesso: string;
  neutro: string;
  overlay: string;
  trilhaGauge: string;
}

export const temaClaro: Tema = {
  escuro: false,
  fundo: '#EEF1F6',
  superficie: '#FFFFFF',
  superficieAlta: '#F6F8FB',
  borda: '#DCE2EC',
  bordaForte: '#B9C3D3',
  texto: '#0B1A33',
  textoSuave: '#4A5873',
  textoFraco: '#7D8AA3',
  primaria: marca.azulFord,
  sobrePrimaria: '#FFFFFF',
  destaque: '#1F63D6',
  faixa: marca.azulFord,
  sobreFaixa: '#FFFFFF',
  sobreFaixaSuave: '#B7C8E6',
  perigo: '#D11F2A',
  alerta: '#E8650A',
  atencao: '#C98F00',
  sucesso: '#1E8A55',
  neutro: '#5E6B82',
  overlay: 'rgba(7,14,28,0.55)',
  trilhaGauge: '#DCE2EC',
};

export const temaEscuro: Tema = {
  escuro: true,
  fundo: marca.azulNoite,
  superficie: '#0F1B31',
  superficieAlta: '#15243F',
  borda: '#1E2E4C',
  bordaForte: '#2C3F63',
  texto: '#E8EEF8',
  textoSuave: '#A9B6CF',
  textoFraco: '#6F7F9E',
  primaria: marca.azulSinal,
  sobrePrimaria: '#FFFFFF',
  destaque: '#5B9BFF',
  faixa: '#0A1628',
  sobreFaixa: '#FFFFFF',
  sobreFaixaSuave: '#8FA3C7',
  perigo: '#FF4B55',
  alerta: '#FF8A3D',
  atencao: '#F5B400',
  sucesso: '#34C27E',
  neutro: '#8392AD',
  overlay: 'rgba(0,0,0,0.65)',
  trilhaGauge: '#1E2E4C',
};

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const raio = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

// nomes = arquivo ttf embutido pelo plugin do expo-font (no android o family é o nome do arquivo)
export const fonte = {
  regular: 'Barlow_400Regular',
  media: 'Barlow_500Medium',
  semi: 'Barlow_600SemiBold',
  negrito: 'Barlow_700Bold',
  condMedia: 'BarlowCondensed_500Medium',
  condSemi: 'BarlowCondensed_600SemiBold',
  condNegrito: 'BarlowCondensed_700Bold',
  condExtra: 'BarlowCondensed_800ExtraBold',
} as const;

export type VarianteTexto =
  | 'display'
  | 'titulo'
  | 'subtitulo'
  | 'corpo'
  | 'corpoForte'
  | 'legenda'
  | 'rotulo'
  | 'numero'
  | 'numeroGrande';

export const tipografia: Record<VarianteTexto, TextStyle> = {
  display: { fontFamily: fonte.condExtra, fontSize: 32, lineHeight: 34, letterSpacing: 0.3, textTransform: 'uppercase' },
  titulo: { fontFamily: fonte.condNegrito, fontSize: 24, lineHeight: 27, letterSpacing: 0.2 },
  subtitulo: { fontFamily: fonte.semi, fontSize: 16, lineHeight: 21 },
  corpo: { fontFamily: fonte.regular, fontSize: 15, lineHeight: 21 },
  corpoForte: { fontFamily: fonte.semi, fontSize: 15, lineHeight: 21 },
  legenda: { fontFamily: fonte.media, fontSize: 12.5, lineHeight: 16 },
  rotulo: { fontFamily: fonte.condSemi, fontSize: 12.5, lineHeight: 15, letterSpacing: 1.4, textTransform: 'uppercase' },
  numero: { fontFamily: fonte.condNegrito, fontSize: 28, lineHeight: 30, fontVariant: ['tabular-nums'] },
  numeroGrande: { fontFamily: fonte.condExtra, fontSize: 44, lineHeight: 46, fontVariant: ['tabular-nums'] },
};
