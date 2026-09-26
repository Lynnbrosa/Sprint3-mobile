import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import type { NomeIcone } from '@/constants/dominio';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import { Texto } from './Texto';

type Tom = 'sucesso' | 'perigo' | 'info';

interface ToastState {
  msg: { id: number; texto: string; icone: NomeIcone; tom: Tom } | null;
  mostrar: (texto: string, tom?: Tom, icone?: NomeIcone) => void;
}

const ICONE_PADRAO: Record<Tom, NomeIcone> = { sucesso: 'check-circle', perigo: 'alert-circle', info: 'information' };

export const useToast = create<ToastState>((set) => ({
  msg: null,
  mostrar: (texto, tom = 'sucesso', icone) => set({ msg: { id: Date.now(), texto, tom, icone: icone ?? ICONE_PADRAO[tom] } }),
}));

export function ToastHost() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const msg = useToast((s) => s.msg);
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!msg) return;
    y.setValue(0);
    // entra com mola passando do ponto, segura e sai
    const anim = Animated.sequence([
      Animated.spring(y, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 }),
      Animated.delay(2400),
      Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [msg, y]);

  if (!msg) return null;
  const cor = { sucesso: t.sucesso, perigo: t.perigo, info: t.destaque }[msg.tom];

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          bottom: insets.bottom + 84,
          backgroundColor: t.escuro ? t.superficieAlta : '#0B1A33',
          borderColor: cor,
          opacity: y,
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      <MaterialCommunityIcons name={msg.icone} size={20} color={cor} />
      <Texto variante="corpoForte" cor="#fff" style={styles.texto}>
        {msg.texto}
      </Texto>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: espaco.lg,
    right: espaco.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingVertical: 14,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.md,
    borderLeftWidth: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  texto: { flex: 1 },
});
