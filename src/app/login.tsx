import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Regua } from '@/components/ui/Regua';
import { Texto } from '@/components/ui/Texto';
import { normalizarErro } from '@/lib/api/erros';
import { useAuth } from '@/store/auth';
import { useConfig } from '@/store/config';
import { espaco, fonte, marca, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';

// contas de demonstração do DataSeeder do backend; valem nos dois modos
const CONTAS_DEMO = [
  { rotulo: 'Consultor', email: 'consultor@ford.com', senha: 'cons123', icone: 'account-tie' as const },
  { rotulo: 'Admin', email: 'admin@ford.com', senha: 'admin123', icone: 'shield-account' as const },
  { rotulo: 'Analista', email: 'analista@ford.com', senha: 'analista123', icone: 'chart-box-outline' as const },
];

export default function Login() {
  const t = useTema();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { modo, apiUrl } = useConfig();
  const aviso = useAuth((s) => s.aviso);
  const entrar = useAuth((s) => s.entrar);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<{ email?: string; senha?: string; geral?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const senhaRef = useRef<TextInput>(null);

  const enviar = async (e = email, s = senha) => {
    const locais: typeof erros = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim())) locais.email = 'Informe um e-mail válido.';
    if (s.length < 6) locais.senha = 'A senha tem pelo menos 6 caracteres.';
    setErros(locais);
    if (Object.keys(locais).length) return;

    setEnviando(true);
    try {
      await entrar(e, s);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (err) {
      const n = normalizarErro(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setErros({ email: n.detalhes?.email, senha: n.detalhes?.senha, geral: n.mensagem });
    } finally {
      setEnviando(false);
    }
  };

  const servidorLabel = modo === 'demo' ? 'Demonstração offline' : apiUrl.replace(/^https?:\/\//, '');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.topo, { paddingTop: insets.top + espaco.xxl, backgroundColor: t.escuro ? t.faixa : marca.azulFord }]}>
          <Image source={require('../../assets/marca.png')} style={styles.marca} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Texto variante="display" cor="#fff" style={styles.nome}>
            PrevioPLS
          </Texto>
          <Texto variante="rotulo" cor="#B7C8E6" centro>
            {'Predict & Care · pós-venda Ford'}
          </Texto>
          <View style={styles.reguaTopo}>
            <Regua tracos={42} vermelhos={7} />
          </View>
        </View>

        <View style={[styles.form, { backgroundColor: t.fundo }]}>
          <View style={{ gap: 4 }}>
            <Texto variante="titulo">Entrar na carteira</Texto>
            <Texto suave>Clientes com risco de sair da rede, na ordem em que precisam de você.</Texto>
          </View>

          {aviso ? <Aviso tom="alerta" icone="timer-sand-complete" texto={aviso} /> : null}
          {erros.geral ? <Aviso tom="perigo" texto={erros.geral} /> : null}

          <Campo
            rotulo="E-mail"
            icone="email-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@concessionaria.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => senhaRef.current?.focus()}
            erro={erros.email}
            editable={!enviando}
            testID="login-email"
          />
          <Campo
            ref={senhaRef}
            rotulo="Senha"
            icone="lock-outline"
            senha
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••"
            autoComplete="password"
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={() => enviar()}
            erro={erros.senha}
            editable={!enviando}
            testID="login-senha"
          />
          <Botao titulo="Entrar" icone="login" onPress={() => enviar()} carregando={enviando} testID="login-entrar" />

          <View style={{ gap: espaco.sm }}>
            <Texto variante="rotulo" fraco>
              Acesso rápido · contas de demonstração
            </Texto>
            <View style={styles.contas}>
              {CONTAS_DEMO.map((c) => (
                <Pressable
                  key={c.email}
                  disabled={enviando}
                  onPress={() => {
                    setEmail(c.email);
                    setSenha(c.senha);
                    enviar(c.email, c.senha);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Entrar como ${c.rotulo}`}
                  style={({ pressed }) => [styles.conta, { borderColor: t.borda, backgroundColor: t.superficie }, pressed && { opacity: 0.75 }]}
                >
                  <MaterialCommunityIcons name={c.icone} size={22} color={t.destaque} />
                  <Texto variante="legenda" style={{ fontFamily: fonte.semi }}>
                    {c.rotulo}
                  </Texto>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/servidor')}
            accessibilityRole="button"
            accessibilityLabel={`Servidor: ${servidorLabel}. Toque para trocar`}
            style={({ pressed }) => [styles.servidor, { borderColor: t.borda }, pressed && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name={modo === 'demo' ? 'cloud-off-outline' : 'server-network'} size={20} color={t.textoSuave} />
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo" fraco>
                Servidor
              </Texto>
              <Texto variante="corpoForte" numberOfLines={1}>
                {servidorLabel}
              </Texto>
            </View>
            <Texto variante="legenda" cor={t.destaque} style={{ fontFamily: fonte.semi }}>
              Trocar
            </Texto>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topo: {
    alignItems: 'center',
    paddingHorizontal: espaco.xl,
    paddingBottom: espaco.lg,
  },
  marca: { width: 104, height: 104 },
  nome: { fontSize: 44, lineHeight: 46, marginTop: espaco.sm, letterSpacing: 1.5 },
  reguaTopo: { alignSelf: 'stretch', marginTop: espaco.xl },
  form: { flex: 1, padding: espaco.xl, gap: espaco.lg },
  contas: { flexDirection: 'row', gap: espaco.sm },
  conta: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: espaco.md,
    borderRadius: raio.md,
    borderWidth: 1,
  },
  servidor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.md,
    borderRadius: raio.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 'auto',
  },
});
