import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Gauge } from '@/components/lead/Gauge';
import { TagPerfil, TagPrioridade } from '@/components/lead/Tags';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Cartao } from '@/components/ui/Cartao';
import { Chip } from '@/components/ui/Chip';
import { Estado } from '@/components/ui/Estado';
import { Faixa } from '@/components/ui/Faixa';
import { Texto } from '@/components/ui/Texto';
import { MODELOS_FORD, PERFIL_DESCRICAO, podeCadastrarVenda, prioridadeDoScore, REGIOES } from '@/constants/dominio';
import { gerarCpf, gerarVin } from '@/demo/servidor';
import { Api } from '@/lib/api/endpoints';
import { normalizarErro } from '@/lib/api/erros';
import { useAuth } from '@/store/auth';
import { useLeads } from '@/store/leads';
import { espaco } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { ClienteCreatedResponse } from '@/types/api';

interface Form {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  regiao: string;
  modelo: string;
  versao: string;
  ano: string;
  vin: string;
  dataCompra: string; // dd/mm/aaaa na tela, ISO no corpo
  valorCompra: string;
  concessionariaId: string;
}

function hojeBr(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const VAZIO: Form = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  regiao: 'SP',
  modelo: 'Ranger',
  versao: '',
  ano: String(new Date().getFullYear()),
  vin: '',
  dataCompra: hojeBr(),
  valorCompra: '',
  concessionariaId: 'FORD-6689',
};

function brParaIso(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return Number.isNaN(new Date(`${iso}T12:00:00`).getTime()) ? null : iso;
}

// mesmas regras do ClienteCreateRequest/VeiculoRequest; o backend valida de novo
function validar(f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.nome.trim().length < 2) e.nome = 'Informe o nome do comprador.';
  if (!/^\d{11}$/.test(f.cpf)) e.cpf = 'CPF com 11 dígitos, só números.';
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'E-mail inválido.';
  if (f.telefone.length > 20) e.telefone = 'Até 20 caracteres.';
  if (!f.versao.trim()) e.versao = 'Informe a versão (ex.: XLT).';
  const ano = Number(f.ano);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) e.ano = 'Ano entre 2000 e 2100.';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(f.vin)) e.vin = '17 caracteres, sem I, O ou Q.';
  if (!brParaIso(f.dataCompra)) e.dataCompra = 'Data no formato dd/mm/aaaa.';
  if (!(Number(f.valorCompra.replace(',', '.')) >= 0) || !f.valorCompra) e.valorCompra = 'Valor da nota, em reais.';
  if (!f.concessionariaId.trim()) e.concessionariaId = 'Código da concessionária.';
  return e;
}

export default function NovaVenda() {
  const t = useTema();
  const router = useRouter();
  const papel = useAuth((s) => s.perfil?.papel);
  const [f, setF] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ClienteCreatedResponse | null>(null);
  const rolagem = useRef<ScrollView>(null);

  if (!podeCadastrarVenda(papel)) {
    return (
      <View style={{ flex: 1, backgroundColor: t.fundo }}>
        <Faixa titulo="Nova venda" />
        <Estado icone="lock-outline" titulo="Só administradores" mensagem="O cadastro do D0 vem do faturamento ou do admin da concessionária." />
      </View>
    );
  }

  const campo = (k: keyof Form) => ({
    value: f[k],
    onChangeText: (v: string) => {
      setF((x) => ({ ...x, [k]: v }));
      if (erros[k]) setErros((x) => ({ ...x, [k]: '' }));
    },
    erro: erros[k] || null,
  });

  const exemplo = () => {
    setResultado(null);
    setErros({});
    setF({
      ...VAZIO,
      nome: 'Marina Duarte',
      cpf: gerarCpf(),
      email: 'marina.duarte@email.com',
      telefone: '11987654321',
      regiao: 'SP',
      // essa combinação cai em Abandono crítico no classificador local: mostra o lead nascendo
      modelo: 'Ranger',
      versao: 'Limited',
      vin: gerarVin(),
      valorCompra: '289900',
      concessionariaId: 'FORD-6689',
    });
  };

  const enviar = async () => {
    const e = validar(f);
    setErros(e);
    setErroGeral(null);
    if (Object.keys(e).length) {
      rolagem.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setEnviando(true);
    try {
      const r = await Api.cadastrarVenda({
        nome: f.nome.trim(),
        cpf: f.cpf,
        email: f.email.trim() || undefined,
        telefone: f.telefone.trim() || undefined,
        regiao: f.regiao,
        veiculo: {
          modelo: f.modelo,
          versao: f.versao.trim(),
          ano: Number(f.ano),
          vin: f.vin,
          dataCompra: brParaIso(f.dataCompra)!,
          valorCompra: f.valorCompra.replace(',', '.'),
          concessionariaId: f.concessionariaId.trim(),
        },
      });
      setResultado(r);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      // a carteira ganhou (ou não) um lead novo
      useLeads.getState().carregar('refresh');
      setTimeout(() => rolagem.current?.scrollToEnd({ animated: true }), 150);
    } catch (err) {
      const n = normalizarErro(err);
      if (n.detalhes) {
        // details do backend vêm com o caminho do campo: "veiculo.vin", "cpf"...
        setErros(Object.fromEntries(Object.entries(n.detalhes).map(([k, v]) => [k.replace('veiculo.', ''), v])));
      }
      setErroGeral(n.mensagem);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Faixa sobretitulo="Faturamento · dia da compra" titulo="Nova venda" subtitulo="O motor classifica o comprador no ato da compra." />
      <ScrollView ref={rolagem} contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Aviso
          icone="shield-check-outline"
          texto="Só entram variáveis do momento da compra (US02). Nada pós-venda alimenta o modelo."
          acao={{ titulo: 'Exemplo', onPress: exemplo }}
        />
        {erroGeral ? <Aviso tom="perigo" texto={erroGeral} /> : null}

        <Texto variante="titulo" style={styles.secao}>
          Comprador
        </Texto>
        <Campo rotulo="Nome" icone="account-outline" placeholder="Nome completo" autoCapitalize="words" {...campo('nome')} />
        <Campo rotulo="CPF" icone="card-account-details-outline" placeholder="Somente números" keyboardType="number-pad" maxLength={11} {...campo('cpf')} />
        <View style={styles.dupla}>
          <View style={{ flex: 1 }}>
            <Campo rotulo="E-mail" placeholder="opcional" keyboardType="email-address" autoCapitalize="none" {...campo('email')} />
          </View>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Telefone" placeholder="opcional" keyboardType="phone-pad" {...campo('telefone')} />
          </View>
        </View>
        <Texto variante="rotulo" suave>
          Região
        </Texto>
        <View style={styles.grade}>
          {REGIOES.map((r) => (
            <Chip key={r} rotulo={r} ativo={f.regiao === r} onPress={() => setF((x) => ({ ...x, regiao: r }))} />
          ))}
        </View>

        <Texto variante="titulo" style={[styles.secao, { marginTop: espaco.md }]}>
          Veículo
        </Texto>
        <View style={styles.grade}>
          {MODELOS_FORD.map((m) => (
            <Chip key={m} rotulo={m} icone="car-side" ativo={f.modelo === m} onPress={() => setF((x) => ({ ...x, modelo: m }))} />
          ))}
        </View>
        <View style={styles.dupla}>
          <View style={{ flex: 1.4 }}>
            <Campo rotulo="Versão" placeholder="XLT, Limited…" {...campo('versao')} />
          </View>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Ano" keyboardType="number-pad" maxLength={4} {...campo('ano')} />
          </View>
        </View>
        <Campo
          rotulo="VIN (chassi)"
          icone="barcode"
          placeholder="17 caracteres"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={17}
          {...campo('vin')}
          onChangeText={(v) => {
            setF((x) => ({ ...x, vin: v.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
            if (erros.vin) setErros((x) => ({ ...x, vin: '' }));
          }}
        />
        <View style={styles.dupla}>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Data da compra" placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" maxLength={10} {...campo('dataCompra')} />
          </View>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Valor (R$)" placeholder="259900" keyboardType="decimal-pad" {...campo('valorCompra')} />
          </View>
        </View>
        <Campo rotulo="Concessionária" icone="storefront-outline" autoCapitalize="characters" {...campo('concessionariaId')} />

        <Botao titulo="Classificar e cadastrar" icone="brain" onPress={enviar} carregando={enviando} />

        {resultado ? (
          <Cartao style={styles.resultado}>
            <Texto variante="rotulo" suave>
              Resultado da classificação
            </Texto>
            <Gauge valor={resultado.scoreRisco} tamanho={180} />
            <View style={styles.tags}>
              <TagPerfil perfil={resultado.perfil} />
              {resultado.leadId ? <TagPrioridade prioridade={prioridadeDoScore(resultado.scoreRisco)} /> : null}
            </View>
            <Texto suave centro>
              {PERFIL_DESCRICAO[resultado.perfil]}
            </Texto>
            {resultado.leadId ? (
              <Botao
                titulo="Abrir lead gerado"
                icone="arrow-right"
                variante="secundario"
                onPress={() => router.push({ pathname: '/lead/[id]', params: { id: resultado.leadId! } })}
                style={{ alignSelf: 'stretch' }}
              />
            ) : (
              <Aviso tom="sucesso" texto="Perfil sem risco de evasão: não gera lead para o consultor." />
            )}
            <Botao
              titulo="Cadastrar outra venda"
              variante="fantasma"
              onPress={() => {
                setResultado(null);
                setF(VAZIO);
                rolagem.current?.scrollTo({ y: 0, animated: true });
              }}
            />
          </Cartao>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: 56 },
  dupla: { flexDirection: 'row', gap: espaco.md },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  resultado: { alignItems: 'center', gap: espaco.md, marginTop: espaco.sm },
  tags: { flexDirection: 'row', gap: espaco.sm },
  secao: { fontSize: 20, marginTop: espaco.xs },
});
