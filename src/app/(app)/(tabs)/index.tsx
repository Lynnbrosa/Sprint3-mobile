import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LeadCard } from '@/components/lead/LeadCard';
import { Aviso } from '@/components/ui/Aviso';
import { Chip } from '@/components/ui/Chip';
import { Estado } from '@/components/ui/Estado';
import { Faixa } from '@/components/ui/Faixa';
import { Segmentado } from '@/components/ui/Segmentado';
import { Texto } from '@/components/ui/Texto';
import { corPrioridade, PRIORIDADE_LABEL, PRIORIDADES, STATUS_LABEL } from '@/constants/dominio';
import { horaCurta, primeiroNome, saudacao } from '@/lib/formato';
import { useAuth } from '@/store/auth';
import { useLeads } from '@/store/leads';
import { espaco, fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { LeadListItem, StatusLead } from '@/types/api';

const OPCOES_STATUS: { valor: StatusLead; rotulo: string }[] = [
  { valor: 'aberto', rotulo: 'Abertos' },
  { valor: 'agendado', rotulo: 'Agendados' },
  { valor: 'recusado', rotulo: 'Recusados' },
  { valor: 'sem-contato', rotulo: 'Sem contato' },
];

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function Leads() {
  const t = useTema();
  const router = useRouter();
  const perfil = useAuth((s) => s.perfil);
  const usuario = useAuth((s) => s.usuario);
  const { filtro, itens, total, carregando, atualizando, carregandoMais, erro, origem, atualizadoEm } = useLeads();
  const { carregar, carregarMais, definirFiltro } = useLeads.getState();
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregar('inicial');
  }, [carregar]);

  // voltou de outra aba ou da visão 360: atualiza em silêncio se a lista já existe
  useFocusEffect(
    useCallback(() => {
      if (useLeads.getState().pagina > 0) useLeads.getState().carregar('refresh');
    }, []),
  );

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return itens;
    return itens.filter((l) => normalizar(`${l.nomeCliente} ${l.modeloVeiculo}`).includes(q));
  }, [itens, busca]);

  const criticos = itens.filter((l) => l.prioridade === 'critica').length;
  const abrir = useCallback((id: string) => router.push({ pathname: '/lead/[id]', params: { id } }), [router]);
  const nome = primeiroNome(usuario?.nome ?? perfil?.nome ?? '');

  const subtitulo =
    filtro.status === 'aberto'
      ? `${total} em aberto${criticos ? ` · ${criticos} crítico${criticos > 1 ? 's' : ''} no topo` : ''}`
      : `${total} ${STATUS_LABEL[filtro.status].toLowerCase()}`;

  const renderItem = useCallback(({ item }: { item: LeadListItem }) => <LeadCard lead={item} onPress={abrir} />, [abrir]);

  return (
    <View style={{ flex: 1, backgroundColor: t.fundo }}>
      <Faixa sobretitulo={nome ? `${saudacao()}, ${nome}` : saudacao()} titulo="Carteira" subtitulo={subtitulo}>
        <View style={{ marginTop: espaco.md }}>
          <Segmentado sobreFaixa opcoes={OPCOES_STATUS} valor={filtro.status} onChange={(status) => definirFiltro({ status })} />
        </View>
      </Faixa>

      <View style={styles.ferramentas}>
        <View style={[styles.busca, { backgroundColor: t.superficie, borderColor: t.borda }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={t.textoFraco} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar cliente ou modelo"
            placeholderTextColor={t.textoFraco}
            style={[styles.buscaInput, { color: t.texto }]}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar cliente ou modelo"
          />
          {busca ? <MaterialCommunityIcons name="close-circle" size={18} color={t.textoFraco} onPress={() => setBusca('')} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip rotulo="Todas" ativo={!filtro.prioridade} onPress={() => definirFiltro({ prioridade: null })} />
          {PRIORIDADES.map((p) => (
            <Chip
              key={p}
              rotulo={PRIORIDADE_LABEL[p]}
              cor={corPrioridade(p, t)}
              ativo={filtro.prioridade === p}
              onPress={() => definirFiltro({ prioridade: filtro.prioridade === p ? null : p })}
              testID={`filtro-${p}`}
            />
          ))}
        </ScrollView>
      </View>

      {perfil?.papel === 'analista' ? (
        <View style={styles.aviso}>
          <Aviso icone="eye-outline" texto="Perfil analista: você acompanha a carteira, mas não registra resultados." />
        </View>
      ) : null}

      {erro && itens.length > 0 ? (
        <View style={styles.aviso}>
          <Aviso
            tom={erro.semConexao ? 'alerta' : 'perigo'}
            texto={
              erro.semConexao && atualizadoEm
                ? `Sem conexão com o servidor. Mostrando a carteira de ${horaCurta(atualizadoEm)}.`
                : erro.mensagem
            }
            acao={{ titulo: 'Tentar', onPress: () => carregar('refresh') }}
          />
        </View>
      ) : null}

      {carregando && itens.length === 0 ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={t.destaque} />
          <Texto suave style={{ marginTop: espaco.md }}>
            Buscando a carteira…
          </Texto>
        </View>
      ) : erro && itens.length === 0 ? (
        <Estado
          icone={erro.semConexao ? 'wifi-off' : 'alert-octagon-outline'}
          cor={t.perigo}
          titulo={erro.semConexao ? 'Sem conexão' : 'Não deu para carregar'}
          mensagem={erro.mensagem}
          acao={{ titulo: 'Tentar de novo', icone: 'refresh', onPress: () => carregar('inicial') }}
        />
      ) : (
        <FlatList
          data={visiveis}
          keyExtractor={(l) => l.id}
          renderItem={renderItem}
          contentContainerStyle={visiveis.length === 0 ? { flexGrow: 1 } : styles.lista}
          onEndReached={() => {
            if (!busca) carregarMais();
          }}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          windowSize={9}
          removeClippedSubviews
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={() => carregar('refresh')} tintColor={t.destaque} colors={[t.primaria]} progressBackgroundColor={t.superficie} />
          }
          ListHeaderComponent={
            visiveis.length > 0 ? (
              <View style={styles.cabecalhoLista}>
                <Texto variante="rotulo" fraco>
                  {busca ? `${visiveis.length} de ${itens.length}` : `${itens.length} de ${total}`} · maior risco primeiro
                </Texto>
                {origem === 'rede' && atualizadoEm ? (
                  <Texto variante="legenda" fraco>
                    atualizado às {horaCurta(atualizadoEm)}
                  </Texto>
                ) : null}
              </View>
            ) : null
          }
          ListFooterComponent={carregandoMais ? <ActivityIndicator style={{ margin: espaco.lg }} color={t.destaque} /> : <View style={{ height: espaco.xl }} />}
          ListEmptyComponent={
            busca ? (
              <Estado icone="account-search-outline" titulo="Ninguém com esse nome" mensagem={`Nenhum cliente ou modelo contém "${busca}".`} />
            ) : filtro.status === 'aberto' ? (
              <Estado
                icone="check-decagram-outline"
                cor={t.sucesso}
                titulo="Carteira em dia"
                mensagem="Nenhum lead aberto com esse filtro. Os próximos chegam assim que o faturamento registrar uma venda de risco."
                acao={{ titulo: 'Atualizar', icone: 'refresh', onPress: () => carregar('refresh') }}
              />
            ) : (
              <Estado icone="inbox-outline" titulo={`Nada em ${STATUS_LABEL[filtro.status].toLowerCase()}`} mensagem="Os resultados que você registrar aparecem aqui." />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ferramentas: { paddingTop: espaco.md, gap: espaco.sm },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    marginHorizontal: espaco.lg,
    paddingHorizontal: espaco.md,
    borderRadius: raio.md,
    borderWidth: 1,
    height: 44,
  },
  buscaInput: { flex: 1, fontFamily: fonte.media, fontSize: 15, paddingVertical: 0 },
  chips: { gap: espaco.sm, paddingHorizontal: espaco.lg, paddingVertical: 2 },
  aviso: { paddingHorizontal: espaco.lg, paddingTop: espaco.sm },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { paddingBottom: espaco.lg },
  cabecalhoLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espaco.lg + 2,
    paddingTop: espaco.md,
    paddingBottom: espaco.xs,
  },
});
