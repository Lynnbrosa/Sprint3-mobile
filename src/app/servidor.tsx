import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { BotaoIcone } from '@/components/ui/BotaoIcone';
import { Campo } from '@/components/ui/Campo';
import { Faixa } from '@/components/ui/Faixa';
import { Texto } from '@/components/ui/Texto';
import { useToast } from '@/components/ui/Toast';
import type { NomeIcone } from '@/constants/dominio';
import { confirmar } from '@/lib/confirmar';
import { useAuth } from '@/store/auth';
import { normalizarUrl, useConfig, type ModoServidor } from '@/store/config';
import { useLeads } from '@/store/leads';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { HealthResponse, VersionResponse } from '@/types/api';

const ATALHOS = [
  { rotulo: 'Emulador Android', url: 'http://10.0.2.2:5000' },
  { rotulo: 'Web / iOS simulador', url: 'http://localhost:5000' },
];

type Teste = { ok: true; ms: number; health: HealthResponse; version?: VersionResponse } | { ok: false; mensagem: string } | null;

export default function Servidor() {
  const t = useTema();
  const router = useRouter();
  const config = useConfig();
  const situacao = useAuth((s) => s.situacao);
  const toast = useToast((s) => s.mostrar);

  const [modo, setModo] = useState<ModoServidor>(config.modo);
  const [url, setUrl] = useState(config.apiUrl);
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<Teste>(null);

  const urlFinal = normalizarUrl(url);
  const semTls = modo === 'api' && urlFinal.startsWith('http://');
  const mudou = modo !== config.modo || (modo === 'api' && urlFinal !== config.apiUrl);

  // aberto sem nada embaixo na pilha (abertura fria) não tem pra onde voltar
  const fechar = () => {
    if (router.canGoBack()) router.back();
    else router.replace(useAuth.getState().situacao === 'logado' ? '/' : '/login');
  };

  const testar = async () => {
    setTestando(true);
    setTeste(null);
    const inicio = Date.now();
    try {
      // chamada crua, fora do cliente da app: testa o endereço antes de salvar
      const { data } = await axios.get<HealthResponse>(`${urlFinal}/health`, { timeout: 10000 });
      const version = await axios
        .get<VersionResponse>(`${urlFinal}/version`, { timeout: 5000 })
        .then((r) => r.data)
        .catch(() => undefined);
      setTeste({ ok: true, ms: Date.now() - inicio, health: data, version });
    } catch (e) {
      const semResposta = axios.isAxiosError(e) && !e.response;
      setTeste({
        ok: false,
        mensagem: semResposta
          ? 'Nada respondeu nesse endereço. Confira se o backend está no ar e se o celular enxerga a máquina.'
          : `O servidor respondeu com erro (HTTP ${axios.isAxiosError(e) ? e.response?.status : '?'}).`,
      });
    } finally {
      setTestando(false);
    }
  };

  const aplicar = async () => {
    await config.definirServidor(modo, urlFinal);
    useLeads.getState().limpar();
    toast(modo === 'demo' ? 'Modo demonstração ativado' : 'Servidor atualizado', 'info', 'server-network');
  };

  const salvar = () => {
    if (!mudou) return fechar();
    if (situacao === 'logado') {
      confirmar(
        'Trocar de servidor',
        'A sessão atual pertence ao outro servidor. Você vai precisar entrar de novo.',
        'Trocar e sair',
        async () => {
          // fecha antes do logout: o logout apaga a pilha protegida e o modal ficava sozinho, sem volta
          fechar();
          await useAuth.getState().sair();
          await aplicar();
        },
        true,
      );
      return;
    }
    aplicar().then(fechar);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Faixa
        sobretitulo="Configuração"
        titulo="Servidor"
        subtitulo="De onde o app busca a carteira de leads"
        direita={<BotaoIcone icone="close" rotulo="Fechar" onPress={fechar} />}
      />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <OpcaoModo
          ativo={modo === 'demo'}
          icone="cloud-off-outline"
          titulo="Demonstração offline"
          texto="Servidor embutido no app com os 93 leads reais do seed Ford. Login, refresh de token, permissões por perfil e registro de resultado funcionam igual à API."
          onPress={() => setModo('demo')}
        />
        <OpcaoModo
          ativo={modo === 'api'}
          icone="server-network"
          titulo="API PrevioPLS (Spring Boot)"
          texto="Consome o backend challenge-SOA: /v1/auth, /v1/leads, /v1/usuarios/me e /v1/clientes com JWT."
          onPress={() => setModo('api')}
        />

        {modo === 'api' ? (
          <View style={{ gap: espaco.md }}>
            <Campo
              rotulo="Endereço da API"
              icone="link-variant"
              value={url}
              onChangeText={(v) => {
                setUrl(v);
                setTeste(null);
              }}
              placeholder="http://10.0.2.2:5000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              dica="Sem barra no final. O app chama /v1/... a partir daqui."
              testID="servidor-url"
            />
            <View style={styles.atalhos}>
              {ATALHOS.map((a) => (
                <Pressable
                  key={a.url}
                  onPress={() => {
                    setUrl(a.url);
                    setTeste(null);
                  }}
                  style={({ pressed }) => [styles.atalho, { borderColor: t.borda, backgroundColor: t.superficie }, pressed && { opacity: 0.7 }]}
                >
                  <Texto variante="legenda" suave>
                    {a.rotulo}
                  </Texto>
                  <Texto variante="legenda" style={{ fontWeight: '600' }}>
                    {a.url.replace('http://', '')}
                  </Texto>
                </Pressable>
              ))}
            </View>
            {semTls ? (
              <Aviso
                tom="alerta"
                icone="lock-open-alert-outline"
                texto="Endereço sem TLS. Serve para a rede de desenvolvimento; em produção a API fica atrás de HTTPS."
              />
            ) : null}
            <Botao titulo="Testar conexão" icone="lan-connect" variante="secundario" onPress={testar} carregando={testando} />
            {teste?.ok ? (
              <Aviso
                tom="sucesso"
                texto={`Respondeu em ${teste.ms} ms · status ${teste.health.status}${teste.version ? ` · ${teste.version.name} ${teste.version.version}` : ''}`}
              />
            ) : teste && !teste.ok ? (
              <Aviso tom="perigo" texto={teste.mensagem} />
            ) : null}
          </View>
        ) : null}

        <Botao titulo={mudou ? 'Salvar e usar' : 'Fechar'} icone={mudou ? 'content-save-outline' : undefined} onPress={salvar} style={{ marginTop: espaco.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OpcaoModo({ ativo, icone, titulo, texto, onPress }: { ativo: boolean; icone: NomeIcone; titulo: string; texto: string; onPress: () => void }) {
  const t = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: ativo }}
      style={({ pressed }) => [
        styles.opcao,
        { borderColor: ativo ? t.primaria : t.borda, backgroundColor: t.superficie },
        ativo && { borderWidth: 2 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <MaterialCommunityIcons name={icone} size={26} color={ativo ? t.primaria : t.textoFraco} />
      <View style={{ flex: 1, gap: 4 }}>
        <Texto variante="subtitulo">{titulo}</Texto>
        <Texto variante="legenda" suave>
          {texto}
        </Texto>
      </View>
      <MaterialCommunityIcons name={ativo ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={ativo ? t.primaria : t.bordaForte} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: espaco.xl, gap: espaco.lg, paddingBottom: 48 },
  opcao: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.md, padding: espaco.lg, borderRadius: raio.lg, borderWidth: 1 },
  atalhos: { flexDirection: 'row', gap: espaco.sm },
  atalho: { flex: 1, padding: espaco.sm + 2, borderRadius: raio.md, borderWidth: 1, gap: 2 },
});
