import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { corPrioridade, prioridadeDoScore } from '@/constants/dominio';
import { useTema } from '@/theme/useTema';
import { Texto } from '../ui/Texto';

const INICIO = 135;
const VARREDURA = 270;

function ponto(cx: number, cy: number, r: number, graus: number) {
  const a = (graus * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arco(cx: number, cy: number, r: number, de: number, ate: number): string {
  if (ate - de < 0.5) return '';
  const a = ponto(cx, cy, r, de);
  const b = ponto(cx, cy, r, ate);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${ate - de > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

// faixas do conta-giros = cortes de prioridade do backend (0.40 / 0.65 / 0.85)
const ZONAS: [number, number, 'media' | 'alta' | 'critica' | null][] = [
  [0, 0.4, null],
  [0.4, 0.65, 'media'],
  [0.65, 0.85, 'alta'],
  [0.85, 1, 'critica'],
];

interface Props {
  valor: number;
  tamanho?: number;
  rotulo?: string;
}

export function Gauge({ valor, tamanho = 210, rotulo = 'risco de abandono' }: Props) {
  const t = useTema();
  const v = Math.max(0, Math.min(1, valor));
  const cor = corPrioridade(prioridadeDoScore(v), t);
  const espessura = tamanho * 0.075;
  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const r = tamanho / 2 - espessura;
  const rZona = r - espessura * 1.05;
  // leitura fica entre as pontas do arco, abaixo de onde a agulha alcança
  const topoLeitura = cy + r * 0.6;
  const altura = topoLeitura + tamanho * 0.3;

  const anim = useRef(new Animated.Value(0)).current;
  const marcha = useRef(new Animated.Value(0)).current;
  const [mostrado, setMostrado] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setMostrado(value));
    let lenta: Animated.CompositeAnimation | null = null;
    let vivo = true;
    anim.setValue(0);
    // ponteiro sobe com mola e passa do valor, como agulha de verdade
    Animated.spring(anim, { toValue: v, friction: 4.5, tension: 38, useNativeDriver: false }).start(async () => {
      const reduzir = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      if (!vivo || reduzir) return;
      // marcha lenta: a agulha nunca fica 100% parada
      lenta = Animated.loop(
        Animated.sequence([
          Animated.timing(marcha, { toValue: 0.006, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(marcha, { toValue: -0.004, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      lenta.start();
    });
    return () => {
      vivo = false;
      anim.removeListener(id);
      lenta?.stop();
    };
  }, [v, anim, marcha]);

  const ponteiro = r * 0.7;
  const rotacao = Animated.add(anim, marcha).interpolate({
    inputRange: [0, 1],
    outputRange: [`${INICIO}deg`, `${INICIO + VARREDURA}deg`],
  });

  const tracos = Array.from({ length: 11 }, (_, i) => {
    const g = INICIO + (VARREDURA * i) / 10;
    const a = ponto(cx, cy, rZona - espessura * 0.55, g);
    const b = ponto(cx, cy, rZona - espessura * (i % 5 === 0 ? 1.5 : 1.05), g);
    return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={t.textoFraco} strokeWidth={i % 5 === 0 ? 2 : 1.2} strokeLinecap="round" />;
  });

  return (
    <View
      style={{ width: tamanho, height: altura }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${rotulo}: ${Math.round(v * 100)} por cento`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
    >
      <Svg width={tamanho} height={altura}>
        <Path d={arco(cx, cy, r, INICIO, INICIO + VARREDURA)} stroke={t.trilhaGauge} strokeWidth={espessura} strokeLinecap="round" fill="none" />
        <Path d={arco(cx, cy, r, INICIO, INICIO + VARREDURA * mostrado)} stroke={cor} strokeWidth={espessura} strokeLinecap="round" fill="none" />
        {ZONAS.map(([de, ate, p]) =>
          p ? (
            <Path
              key={p}
              d={arco(cx, cy, rZona, INICIO + VARREDURA * de + 1.5, INICIO + VARREDURA * ate - 1.5)}
              stroke={corPrioridade(p, t)}
              strokeWidth={3}
              fill="none"
              opacity={0.9}
            />
          ) : null,
        )}
        {tracos}
        <Circle cx={cx} cy={cy} r={espessura * 0.95} fill={t.texto} />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.eixo,
          { width: ponteiro * 2, height: ponteiro * 2, left: cx - ponteiro, top: cy - ponteiro, transform: [{ rotate: rotacao }] },
        ]}
      >
        <View style={[styles.agulha, { left: ponteiro, top: ponteiro - 2, width: ponteiro, backgroundColor: t.texto }]} />
      </Animated.View>
      <View
        pointerEvents="none"
        style={[styles.tampa, { left: cx - espessura * 0.55, top: cy - espessura * 0.55, width: espessura * 1.1, height: espessura * 1.1, borderRadius: espessura, backgroundColor: cor, borderColor: t.texto }]}
      />

      <View style={[styles.leitura, { top: topoLeitura }]} pointerEvents="none">
        <Texto variante="numeroGrande" cor={cor}>
          {Math.round(mostrado * 100)}
          <Texto variante="numero" cor={cor}>
            %
          </Texto>
        </Texto>
        <Texto variante="rotulo" fraco>
          {rotulo}
        </Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eixo: { position: 'absolute' },
  agulha: { position: 'absolute', height: 4, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  leitura: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tampa: { position: 'absolute', borderWidth: 3 },
});
