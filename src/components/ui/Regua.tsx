import { StyleSheet, View } from 'react-native';
import { marca } from '@/theme/tokens';

// régua do conta-giros: assinatura visual que fecha toda faixa de topo.
// os últimos traços são a faixa vermelha, a mesma do ícone.
export function Regua({ cor = 'rgba(255,255,255,0.28)', tracos = 36, vermelhos = 6 }: { cor?: string; tracos?: number; vermelhos?: number }) {
  return (
    <View style={styles.linha} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: tracos }, (_, i) => {
        const maior = i % 6 === 0;
        const risco = i >= tracos - vermelhos;
        return <View key={i} style={[styles.traco, { height: maior ? 9 : 5, backgroundColor: risco ? marca.vermelhoRisco : cor }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 10 },
  traco: { width: 2, borderRadius: 1 },
});
