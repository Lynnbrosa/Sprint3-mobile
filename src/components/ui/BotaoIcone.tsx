import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import type { NomeIcone } from '@/constants/dominio';

interface Props {
  icone: NomeIcone;
  onPress: () => void;
  rotulo: string;
  cor?: string;
  fundo?: string;
  tamanho?: number;
}

export function BotaoIcone({ icone, onPress, rotulo, cor = '#fff', fundo = 'rgba(255,255,255,0.12)', tamanho = 22 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={8}
      style={({ pressed }) => [styles.botao, { backgroundColor: fundo }, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
    >
      <MaterialCommunityIcons name={icone} size={tamanho} color={cor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
