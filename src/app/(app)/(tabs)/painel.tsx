import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BarraEmpilhada, BarraLinha } from '@/components/painel/Barras';
import { Kpi } from '@/components/painel/Kpi';
import { Aviso } from '@/components/ui/Aviso';
import { Cartao } from '@/components/ui/Cartao';
import { Estado } from '@/components/ui/Estado';
import { Faixa } from '@/components/ui/Faixa';
import { Texto } from '@/components/ui/Texto';
import { corPerfil, corPrioridade, corStatus, PERFIL_LABEL, PRIORIDADE_LABEL, PRIORIDADES } from '@/constants/dominio';
import { Api } from '@/lib/api/endpoints';
import { normalizarErro, type ErroApp } from '@/lib/api/erros';
import { horaCurta } from '@/lib/formato';
import { Local } from '@/lib/storage';
import { useConfig } from '@/store/config';
import { espaco } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { PerfilCliente, PrioridadeLead } from '@/types/api';

interface Resumo {
  abertos: number;
  porPrioridade: Record<PrioridadeLead, number>;
  agendados: number;
  recusados: number;
  semContato: number;
  perfis: { perfil: PerfilCliente; qtd: number; media: number }[];
  scoreMedio: number;
  geradoEm: string;
}

async function montarResumo(): Promise<Resumo> {
  // o contrato não tem endpoint de agregação: conta pelo total de cada filtro
  const [contagens, amostra] = await Promise.all([
    Promise.all([
      Api.contarLeads({ status: 'aberto' }),
      ...PRIORIDADES.map((p) => Api.contarLeads({ status: 'aberto', prioridade: p })),
      Api.contarLeads({ status: 'agendado' }),
      Api.contarLeads({ status: 'recusado' }),
      Api.contarLeads({ status: 'sem-contato' }),
    ]),
    Api.listarLeads({ status: 'aberto', page: 1, perPage: 100 }),
  ]);
  const [abertos, critica, alta, media, baixa, agendados, recusados, semContato] = contagens;

  const grupos = new Map<PerfilCliente, number[]>();
  for (const l of amostra.items) {
    const p = l.perfil ?? 'esquecido';
    grupos.set(p, [...(grupos.get(p) ?? []), l.scoreRisco]);
  }
  const perfis = Array.from(grupos.entries())
    .map(([perfil, scores]) => ({ perfil, qtd: scores.length, media: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => b.media - a.media);
  const todos = amostra.items.map((l) => l.scoreRisco);

  return {
    abertos,
    porPrioridade: { critica, alta, media, baixa },
    agendados,
    recusados,
    semContato,
    perfis,
    scoreMedio: todos.length ? todos.reduce((a, b) => a + b, 0) / todos.length : 0,
    geradoEm: new Date().toISOString(),
  };
}

export default function Painel() {
  const t = useTema();
  const modo = useConfig((s) => s.modo);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<ErroApp | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const chave = `previopls:cache:painel:${modo}`;

  const carregar = useCallback(async () => {
    try {
      const r = await montarResumo();
      setResumo(r);
      setErro(null);
      Local.gravar(chave, r);
    } catch (e) {
      setErro(normalizarErro(e));
      const salvo = await Local.ler<Resumo>(chave);
      if (salvo) setResumo((atual) => atual ?? salvo);
    }
  }, [chave]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const tratados = resumo ? resumo.agendados + resumo.recusados + resumo.semContato : 0;
  const conversao = resumo && tratados ? Math.round((resumo.agendados / tratados) * 100) : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.fundo }}>
      <Faixa
        sobretitulo="Resumo da carteira"
        titulo="Painel"
        subtitulo={resumo ? `Atualizado às ${horaCurta(resumo.geradoEm)}` : 'Contando a carteira…'}
      />
      {!resumo && !erro ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={t.destaque} />
        </View>
      ) : !resumo && erro ? (
        <Estado icone="wifi-off" cor={t.perigo} titulo="Sem dados" mensagem={erro.mensagem} acao={{ titulo: 'Tentar de novo', icone: 'refresh', onPress: carregar }} />
      ) : resumo ? (
        <ScrollView
          contentContainerStyle={styles.conteudo}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={async () => {
                setAtualizando(true);
                await carregar();
                setAtualizando(false);
              }}
              tintColor={t.destaque}
              colors={[t.primaria]}
            />
          }
        >
          {erro ? <Aviso tom="alerta" texto={`Mostrando o último resumo salvo. ${erro.mensagem}`} /> : null}

          <View style={styles.grade}>
            <Kpi rotulo="Em aberto" valor={String(resumo.abertos)} detalhe="clientes esperando abordagem" icone="account-clock-outline" cor={t.destaque} />
            <Kpi
              rotulo="Críticos"
              valor={String(resumo.porPrioridade.critica)}
              detalhe="score ≥ 85%, prioridade máxima"
              icone="car-brake-alert"
              cor={t.perigo}
            />
            <Kpi rotulo="Agendados" valor={String(resumo.agendados)} detalhe="revisões marcadas" icone="calendar-check" cor={t.sucesso} />
            <Kpi
              rotulo="Conversão"
              valor={conversao === null ? '—' : `${conversao}%`}
              detalhe={tratados ? `${resumo.agendados} de ${tratados} contatos` : 'registre resultados para medir'}
              icone="swap-horizontal-circle-outline"
              cor={t.atencao}
            />
          </View>

          <Cartao style={styles.bloco}>
            <Texto variante="rotulo" suave>
              Prioridade dos abertos
            </Texto>
            <BarraEmpilhada
              fatias={PRIORIDADES.map((p) => ({ chave: p, rotulo: PRIORIDADE_LABEL[p], valor: resumo.porPrioridade[p], cor: corPrioridade(p, t) }))}
            />
          </Cartao>

          <Cartao style={styles.bloco}>
            <Texto variante="rotulo" suave>
              Perfil comportamental · score médio
            </Texto>
            {resumo.perfis.length ? (
              resumo.perfis.map((p) => (
                <BarraLinha
                  key={p.perfil}
                  rotulo={PERFIL_LABEL[p.perfil]}
                  valor={p.qtd}
                  maximo={Math.max(...resumo.perfis.map((x) => x.qtd))}
                  cor={corPerfil(p.perfil, t)}
                  extra={`risco médio ${Math.round(p.media * 100)}%`}
                />
              ))
            ) : (
              <Texto suave>Sem leads abertos.</Texto>
            )}
            <Texto variante="legenda" fraco>
              Só Abandono e Esquecido viram lead. Fiel e Econômico ficam fora da carteira do consultor.
            </Texto>
          </Cartao>

          <Cartao style={styles.bloco}>
            <Texto variante="rotulo" suave>
              Resultados registrados
            </Texto>
            <BarraEmpilhada
              fatias={[
                { chave: 'agendado', rotulo: 'Agendado', valor: resumo.agendados, cor: corStatus('agendado', t) },
                { chave: 'recusado', rotulo: 'Recusado', valor: resumo.recusados, cor: corStatus('recusado', t) },
                { chave: 'sem-contato', rotulo: 'Sem contato', valor: resumo.semContato, cor: corStatus('sem-contato', t) },
              ]}
            />
          </Cartao>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
  bloco: { gap: espaco.md },
});
