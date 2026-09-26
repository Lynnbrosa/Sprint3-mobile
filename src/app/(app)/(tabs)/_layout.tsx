import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { podeCadastrarVenda, type NomeIcone } from '@/constants/dominio';
import { useAuth } from '@/store/auth';
import { fonte } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';

function icone(nome: NomeIcone) {
  return function Icone({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <MaterialCommunityIcons name={nome} size={focused ? 26 : 24} color={color} />;
  };
}

export default function TabsLayout() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const papel = useAuth((s) => s.perfil?.papel);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.escuro ? t.destaque : t.primaria,
        tabBarInactiveTintColor: t.textoFraco,
        tabBarStyle: {
          backgroundColor: t.superficie,
          borderTopColor: t.borda,
          height: 66 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontFamily: fonte.condSemi, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
        sceneStyle: { backgroundColor: t.fundo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Leads', tabBarIcon: icone('format-list-bulleted-square') }} />
      <Tabs.Screen name="painel" options={{ title: 'Painel', tabBarIcon: icone('gauge') }} />
      <Tabs.Screen
        name="venda"
        options={{ title: 'Nova venda', tabBarIcon: icone('car-arrow-right'), href: podeCadastrarVenda(papel) ? undefined : null }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icone('account-circle-outline') }} />
    </Tabs>
  );
}
