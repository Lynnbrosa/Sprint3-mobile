import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gauge } from '@/components/lead/Gauge';
import { LinhaInfo, Secao } from '@/components/lead/Secao';
import { alfa, TagPerfil, TagPrioridade, TagStatus } from '@/components/lead/Tags';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { BotaoIcone } from '@/components/ui/BotaoIcone';
import { Estado } from '@/components/ui/Estado';
import { Faixa } from '@/components/ui/Faixa';
import { Texto } from '@/components/ui/Texto';
import { PERFIL_DESCRICAO, perfilDoScore, podeRegistrarResultado } from '@/constants/dominio';
import { Api } from '@/lib/api/endpoints';
import { normalizarErro, type ErroApp } from '@/lib/api/erros';
import { dataCurta, dataHora, diasEntre, dinheiro, haQuanto, paraData, proximaRevisao, textoDoServidor } from '@/lib/formato';
import { Local } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { chaveCacheLead } from '@/store/leads';
import { espaco, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { LeadDetail, StatusLead } from '@/types/api';

export default function VisaoLead() {
  const t = useTema();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const papel = useAuth((s) => s.perfil?.papel);

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [erro, setErro] = useState<ErroApp | null>(null);
  const [doCache, setDoCache] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const buscar = useCallback(async () => {
    if (!id) return;
    try {
      const l = await Api.obterLead(id);
      setLead(l);
      setErro(null);
      setDoCache(false);
      Local.gravar(chaveCacheLead(id), l);
    } catch (e) {
      const n = normalizarErro(e);
      setErro(n);
      if (n.semConexao) {
        const salvo = await Local.ler<LeadDetail>(chaveCacheLead(id));
        if (salvo) {
          setLead(salvo);
          setDoCache(true);
        }
      }
    }
  }, [id]);

  // volta do modal de registro com o status novo
  useFocusEffect(
    useCallback(() => {
      buscar();
    }, [buscar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!lead) {
    return (
      <View style={{ flex: 1, backgroundColor: t.fundo }}>
        <Faixa sobretitulo="Visão 360" titulo="Cliente" esquerda={<BotaoIcone icone="arrow-left" rotulo="Voltar" onPress={voltar} />} />
        {erro ? (
          <Estado
            icone={erro.status === 404 ? 'account-question-outline' : 'wifi-off'}
            cor={t.perigo}
            titulo={erro.status === 404 ? 'Lead não encontrado' : 'Não deu para abrir'}
            mensagem={erro.mensagem}
            acao={{ titulo: 'Tentar de novo', icone: 'refresh', onPress: buscar }}
          />
        ) : (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={t.destaque} />
          </View>
        )}
      </View>
    );
  }

  const { cliente, veiculo } = lead;
  const perfil = cliente.perfil ?? perfilDoScore(lead.scoreRisco);
  const revisao = proximaRevisao(veiculo.dataCompra);
  const compra = paraData(veiculo.dataCompra);
  const diasCompra = compra ? diasEntre(compra, new Date()) : null;
  const podeAgir = podeRegistrarResultado(papel);
  const observacao = textoDoServidor(lead.observacao);

  const registrar = (status: StatusLead) => router.push({ pathname: '/registrar/[id]', params: { id: lead.id, status, nome: cliente.nome } });

  return (
    <View style={{ flex: 1, backgroundColor: t.fundo }}>
      <Faixa
        sobretitulo="Visão 360"
        titulo={cliente.nome}
        subtitulo={`${veiculo.modelo} ${veiculo.versao} ${veiculo.ano} · ${cliente.regiao}`}
        esquerda={<BotaoIcone icone="arrow-left" rotulo="Voltar" onPress={voltar} />}
        direita={<TagPrioridade prioridade={lead.prioridade} cheia />}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: (podeAgir ? 124 : 32) + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={async () => {
              setAtualizando(true);
              await buscar();
              setAtualizando(false);
            }}
            tintColor={t.destaque}
            colors={[t.primaria]}
          />
        }
      >
        {doCache ? (
          <View style={styles.aviso}>
            <Aviso tom="alerta" texto="Sem conexão. Estes são os dados salvos na última visita." acao={{ titulo: 'Tentar', onPress: buscar }} />
          </View>
        ) : null}

        <View style={[styles.hero, { backgroundColor: t.superficie, borderColor: t.borda }]}>
          <Gauge valor={lead.scoreRisco} />
          <View style={styles.tags}>
            <TagPerfil perfil={perfil} />
            <TagStatus status={lead.status} />
          </View>
          <Texto suave centro style={{ paddingHorizontal: espaco.md }}>
            {PERFIL_DESCRICAO[perfil]}
          </Texto>
        </View>

        {revisao ? (
          <View style={[styles.revisao, { backgroundColor: t.superficie, borderColor: revisao.dias < 0 ? t.perigo : t.borda }]}>
            <View style={[styles.revisaoIcone, { backgroundColor: alfa(revisao.dias < 0 ? t.perigo : t.destaque, 0.14) }]}>
              <MaterialCommunityIcons name={revisao.dias < 0 ? 'calendar-alert' : 'calendar-clock'} size={24} color={revisao.dias < 0 ? t.perigo : t.destaque} />
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo" fraco>
                {revisao.numero}ª revisão · estimativa por tempo
              </Texto>
              <Texto variante="subtitulo" cor={revisao.dias < 0 ? t.perigo : t.texto}>
                {revisao.dias < 0
                  ? `Atrasada há ${Math.abs(revisao.dias)} dias`
                  : revisao.dias === 0
                    ? 'Vence hoje'
                    : `Em ${revisao.dias} dias · ${dataCurta(revisao.data.toISOString())}`}
              </Texto>
            </View>
          </View>
        ) : null}

        {lead.scriptOferta ? (
          <Secao titulo="Script de abordagem" icone="message-text-outline">
            <View style={[styles.script, { borderLeftColor: t.destaque, backgroundColor: t.superficieAlta }]}>
              <Texto style={{ lineHeight: 22 }}>{textoDoServidor(lead.scriptOferta)}</Texto>
            </View>
            <Texto variante="legenda" fraco style={{ marginBottom: espaco.sm }}>
              Gerado pelo motor preditivo a partir do perfil {perfil === 'economico' ? 'econômico' : perfil}.
            </Texto>
          </Secao>
        ) : null}

        <Secao titulo="Cliente" icone="account-outline" direita={<MaterialCommunityIcons name="shield-lock-outline" size={16} color={t.textoFraco} />}>
          <LinhaInfo rotulo="Telefone" valor={cliente.telefone ?? '—'} mono />
          <LinhaInfo rotulo="E-mail" valor={cliente.email ?? '—'} />
          <LinhaInfo rotulo="CPF" valor={cliente.cpf} mono />
          <LinhaInfo rotulo="Região" valor={cliente.regiao} />
          <Texto variante="legenda" fraco style={styles.nota}>
            Dados pessoais chegam mascarados pela API (LGPD). O contato completo fica no CRM da concessionária.
          </Texto>
        </Secao>

        <Secao titulo="Veículo na compra" icone="car-info">
          <LinhaInfo rotulo="Modelo" valor={`${veiculo.modelo} ${veiculo.versao}`} />
          <LinhaInfo rotulo="Ano" valor={String(veiculo.ano)} mono />
          <LinhaInfo rotulo="VIN" valor={veiculo.vin} mono />
          <LinhaInfo rotulo="Compra" valor={`${dataCurta(veiculo.dataCompra)}${diasCompra !== null ? ` · ${diasCompra} dias` : ''}`} />
          <LinhaInfo rotulo="Valor" valor={dinheiro(veiculo.valorCompra)} mono />
          <LinhaInfo rotulo="Concessionária" valor={veiculo.concessionariaId} mono />
        </Secao>

        <Secao titulo="Histórico" icone="history">
          <LinhaInfo rotulo="Lead gerado" valor={`${dataHora(lead.criadoEm)}`} />
          <LinhaInfo rotulo="Última alteração" valor={haQuanto(lead.atualizadoEm) || '—'} />
          {observacao ? (
            <View style={[styles.obs, { borderTopColor: t.borda }]}>
              <Texto variante="legenda" suave>
                Observação do consultor
              </Texto>
              <Texto>{observacao}</Texto>
            </View>
          ) : null}
        </Secao>
      </ScrollView>

      {podeAgir ? (
        <View style={[styles.acoes, { backgroundColor: t.superficie, borderTopColor: t.borda, paddingBottom: insets.bottom + espaco.md }]}>
          {lead.status === 'aberto' ? (
            <>
              <Botao titulo="Agendar" icone="calendar-check" cor={t.sucesso} onPress={() => registrar('agendado')} vertical style={styles.acao} testID="acao-agendar" />
              <Botao titulo="Recusou" icone="close-circle-outline" cor={t.perigo} onPress={() => registrar('recusado')} vertical style={styles.acao} testID="acao-recusou" />
              <Botao titulo="Sem contato" icone="phone-off-outline" cor={t.escuro ? '#3A4A68' : t.neutro} onPress={() => registrar('sem-contato')} vertical style={styles.acao} testID="acao-sem-contato" />
            </>
          ) : (
            <Botao titulo="Reabrir lead" icone="backup-restore" variante="secundario" onPress={() => registrar('aberto')} style={styles.acao} />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  aviso: { paddingHorizontal: espaco.lg, paddingTop: espaco.md },
  hero: {
    marginHorizontal: espaco.lg,
    marginTop: espaco.lg,
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    paddingTop: espaco.lg,
    paddingBottom: espaco.lg,
    gap: espaco.md,
  },
  tags: { flexDirection: 'row', gap: espaco.sm },
  revisao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    marginHorizontal: espaco.lg,
    marginTop: espaco.md,
    padding: espaco.md,
    borderRadius: raio.lg,
    borderWidth: 1,
  },
  revisaoIcone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  script: { borderLeftWidth: 4, borderRadius: raio.sm, padding: espaco.md, marginVertical: espaco.sm },
  nota: { paddingTop: espaco.sm, paddingBottom: espaco.xs },
  obs: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 4 },
  acoes: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  acao: { flex: 1, paddingHorizontal: 6 },
});
