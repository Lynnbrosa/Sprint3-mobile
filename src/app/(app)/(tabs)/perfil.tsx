import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { LinhaInfo } from '@/components/lead/Secao';
import { Botao } from '@/components/ui/Botao';
import { Cartao } from '@/components/ui/Cartao';
import { Faixa } from '@/components/ui/Faixa';
import { Segmentado } from '@/components/ui/Segmentado';
import { Texto } from '@/components/ui/Texto';
import { useToast } from '@/components/ui/Toast';
import { PAPEL_LABEL, type NomeIcone } from '@/constants/dominio';
import { restaurarDemo, simularVendaDeRisco } from '@/demo/servidor';
import { horaCurta } from '@/lib/formato';
import { expiraEm } from '@/lib/jwt';
import { confirmar } from '@/lib/confirmar';
import { avisarLeadCritico, avisarResultado, prepararNotificacoes } from '@/lib/notificacoes';
import { Sessao } from '@/lib/sessao';
import { Local } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { useConfig, type PreferenciaTema } from '@/store/config';
import { useLeads } from '@/store/leads';
import { espaco, fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';

const EQUIPE = [
  { nome: 'Giovanne Charelli Zaniboni Silva', rm: '556223' },
  { nome: 'Gustavo Oliveira de Moura', rm: '555827' },
  { nome: 'Lynn Bueno Rosa', rm: '551102' },
];

export default function Perfil() {
  const t = useTema();
  const router = useRouter();
  const toast = useToast((s) => s.mostrar);
  const { perfil, usuario, tokenExpiraEm, sair } = useAuth();
  const { modo, apiUrl, tema, notificacoes, definirTema, definirNotificacoes } = useConfig();
  const [expira, setExpira] = useState<Date | null>(tokenExpiraEm ? new Date(tokenExpiraEm) : null);
  const [simulando, setSimulando] = useState(false);

  useEffect(() => {
    // o access token pode ter sido renovado depois do /me; o valor real está no próprio jwt
    Sessao.access().then((tk) => setExpira(expiraEm(tk)));
  }, [tokenExpiraEm]);

  const alternarNotificacoes = async (ligar: boolean) => {
    if (ligar) {
      const ok = await prepararNotificacoes();
      if (!ok) {
        Alert.alert('Notificações bloqueadas', 'Libere as notificações do PrevioPLS nas configurações do Android.');
        return;
      }
    }
    await definirNotificacoes(ligar);
  };

  const simular = async () => {
    setSimulando(true);
    try {
      const lead = await simularVendaDeRisco();
      if (!lead) {
        toast('Não saiu venda de risco dessa vez. Tente de novo.', 'info');
        return;
      }
      await useLeads.getState().carregar('refresh');
      // se as notificações estão desligadas o consultor ainda vê o aviso na tela
      if (!notificacoes) toast(`Lead crítico: ${lead.cliente.nome}`, 'info', 'car-brake-alert');
    } finally {
      setSimulando(false);
    }
  };

  const restaurar = () =>
    confirmar(
      'Restaurar demonstração',
      'Volta os 93 leads para "aberto" e apaga as vendas simuladas.',
      'Restaurar',
      async () => {
        await restaurarDemo();
        await Local.apagarPrefixo('previopls:cache:');
        await Local.apagar('previopls:criticos-vistos:demo');
        useLeads.getState().limpar();
        await useLeads.getState().carregar('inicial');
        toast('Demonstração restaurada', 'sucesso', 'backup-restore');
      },
      true,
    );

  const confirmarSaida = () =>
    confirmar(
      'Sair',
      'O token é revogado no servidor e apagado do aparelho.',
      'Sair',
      async () => {
        await sair();
        useLeads.getState().limpar();
      },
      true,
    );

  const nome = usuario?.nome ?? perfil?.nome ?? perfil?.email ?? '';
  const versao = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';
  const build = Application.nativeBuildVersion ?? '—';

  return (
    <View style={{ flex: 1, backgroundColor: t.fundo }}>
      <Faixa sobretitulo="Perfil" titulo={nome || 'Conta'} subtitulo={perfil ? PAPEL_LABEL[perfil.papel] : undefined} />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Cartao style={styles.bloco}>
          <Cabeca icone="card-account-details-outline" titulo="Sessão" />
          <LinhaInfo rotulo="E-mail" valor={usuario?.email ?? perfil?.email ?? '—'} />
          <LinhaInfo rotulo="Perfil de acesso" valor={perfil ? PAPEL_LABEL[perfil.papel] : '—'} />
          <LinhaInfo rotulo="Token expira às" valor={expira ? horaCurta(expira) : '—'} mono />
          <Texto variante="legenda" fraco style={{ paddingTop: espaco.sm }}>
            JWT guardado no Keystore do Android (expo-secure-store). Vencendo, o app troca pelo refresh token sem pedir a senha.
          </Texto>
        </Cartao>

        <Cartao style={styles.bloco}>
          <Cabeca icone="theme-light-dark" titulo="Aparência" />
          <Segmentado<PreferenciaTema>
            opcoes={[
              { valor: 'sistema', rotulo: 'Sistema' },
              { valor: 'claro', rotulo: 'Claro' },
              { valor: 'escuro', rotulo: 'Escuro' },
            ]}
            valor={tema}
            onChange={definirTema}
          />
        </Cartao>

        <Cartao style={styles.bloco}>
          <Cabeca icone="bell-ring-outline" titulo="Notificações" />
          <View style={styles.linhaSwitch}>
            <View style={{ flex: 1 }}>
              <Texto variante="corpoForte">Avisar lead crítico</Texto>
              <Texto variante="legenda" suave>
                Quando entra na carteira um cliente com score ≥ 85%.
              </Texto>
            </View>
            <Switch
              value={notificacoes}
              onValueChange={alternarNotificacoes}
              trackColor={{ true: t.primaria, false: t.bordaForte }}
              thumbColor="#fff"
              accessibilityLabel="Avisar lead crítico"
            />
          </View>
          {notificacoes ? (
            <Botao
              titulo="Enviar notificação de teste"
              icone="bell-outline"
              variante="secundario"
              compacto
              onPress={async () => {
                const ok = await prepararNotificacoes();
                if (!ok) {
                  Alert.alert('Notificações bloqueadas', 'Libere as notificações do PrevioPLS nas configurações do Android.');
                  return;
                }
                // usa um crítico de verdade da carteira pra o toque abrir a visão 360
                const alvo = useLeads.getState().itens.find((l) => l.prioridade === 'critica');
                if (alvo) await avisarLeadCritico(alvo.id, alvo.nomeCliente, alvo.modeloVeiculo);
                else await avisarResultado('Teste', 'notificações funcionando');
              }}
            />
          ) : null}
        </Cartao>

        <Pressable onPress={() => router.push('/servidor')} style={({ pressed }) => [pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Cartao style={[styles.bloco, styles.linhaServidor]}>
            <MaterialCommunityIcons name={modo === 'demo' ? 'cloud-off-outline' : 'server-network'} size={24} color={t.destaque} />
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo" fraco>
                Servidor
              </Texto>
              <Texto variante="corpoForte" numberOfLines={1}>
                {modo === 'demo' ? 'Demonstração offline' : apiUrl}
              </Texto>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={t.textoFraco} />
          </Cartao>
        </Pressable>

        {modo === 'demo' ? (
          <Cartao style={[styles.bloco, { borderStyle: 'dashed', borderColor: t.bordaForte }]}>
            <Cabeca icone="flask-outline" titulo="Ferramentas da demonstração" />
            <Texto variante="legenda" suave>
              Simula o faturamento mandando uma venda que o motor classifica como Abandono crítico: o lead entra no topo da carteira e a notificação chega.
            </Texto>
            <Botao titulo="Simular venda de risco" icone="car-arrow-right" onPress={simular} carregando={simulando} compacto />
            <Botao titulo="Restaurar dados da demonstração" icone="backup-restore" variante="secundario" onPress={restaurar} compacto />
          </Cartao>
        ) : null}

        <Cartao style={styles.bloco}>
          <Cabeca icone="information-outline" titulo="Sobre" />
          <LinhaInfo rotulo="Versão" valor={`${versao} (build ${build})`} mono />
          <LinhaInfo rotulo="Projeto" valor="Challenge Ford · FIAP 2026 · Sprint 3" />
          <Texto variante="rotulo" fraco style={{ marginTop: espaco.md, marginBottom: espaco.xs }}>
            Equipe
          </Texto>
          {EQUIPE.map((p) => (
            <View key={p.rm} style={[styles.membro, { borderTopColor: t.borda }]}>
              <Texto variante="corpo" style={{ flex: 1 }}>
                {p.nome}
              </Texto>
              <Texto variante="legenda" suave style={{ fontFamily: fonte.condSemi, fontSize: 14 }}>
                RM {p.rm}
              </Texto>
            </View>
          ))}
        </Cartao>

        <Botao titulo="Sair da conta" icone="logout" variante="perigo" onPress={confirmarSaida} testID="perfil-sair" />
      </ScrollView>
    </View>
  );
}

function Cabeca({ icone, titulo }: { icone: NomeIcone; titulo: string }) {
  const t = useTema();
  return (
    <View style={styles.cabeca}>
      <MaterialCommunityIcons name={icone} size={18} color={t.destaque} />
      <Texto variante="rotulo" suave>
        {titulo}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  bloco: { gap: espaco.sm },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginBottom: 2 },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  linhaServidor: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  membro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: raio.sm,
  },
});
