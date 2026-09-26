import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { BotaoIcone } from '@/components/ui/BotaoIcone';
import { Chip } from '@/components/ui/Chip';
import { Faixa } from '@/components/ui/Faixa';
import { Texto } from '@/components/ui/Texto';
import { useToast } from '@/components/ui/Toast';
import { corStatus, STATUS_ICONE, STATUS_LABEL } from '@/constants/dominio';
import { Api } from '@/lib/api/endpoints';
import { normalizarErro } from '@/lib/api/erros';
import { avisarResultado } from '@/lib/notificacoes';
import { useConfig } from '@/store/config';
import { useLeads } from '@/store/leads';
import { espaco, fonte, raio } from '@/theme/tokens';
import { useTema } from '@/theme/useTema';
import type { StatusLead } from '@/types/api';

const LIMITE = 2000;

const TITULO: Record<StatusLead, string> = {
  agendado: 'Agendar revisão',
  recusado: 'Cliente recusou',
  'sem-contato': 'Sem contato',
  aberto: 'Reabrir lead',
};

const MOTIVOS: Partial<Record<StatusLead, string[]>> = {
  recusado: ['Achou caro', 'Usa oficina de confiança', 'Já revisou em outro lugar', 'Vendeu o veículo', 'Mudou de cidade'],
  'sem-contato': ['Não atende', 'Caixa postal', 'Número inválido', 'Pediu retorno depois'],
  aberto: ['Cliente retornou o contato', 'Registro feito por engano'],
};

const HORARIOS = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30'];

function proximosDias(): { rotulo: string; data: Date }[] {
  const out: { rotulo: string; data: Date }[] = [];
  const d = new Date();
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  for (let i = 1; out.length < 6 && i < 14; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    if (x.getDay() === 0) continue; // oficina não abre domingo
    out.push({ rotulo: `${i === 1 ? 'amanhã' : nomes[x.getDay()]} ${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`, data: x });
  }
  return out;
}

export default function Registrar() {
  const t = useTema();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast((s) => s.mostrar);
  const notificacoes = useConfig((s) => s.notificacoes);
  const params = useLocalSearchParams<{ id: string; status: StatusLead; nome?: string }>();
  const status: StatusLead = params.status ?? 'agendado';
  const cor = corStatus(status, t);

  const dias = useMemo(proximosDias, []);
  const [dia, setDia] = useState(0);
  const [hora, setHora] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const composta = (() => {
    const partes: string[] = [];
    if (status === 'agendado' && hora) partes.push(`Revisão agendada para ${dias[dia].rotulo.split(' ')[1]} às ${hora}.`);
    if (motivo) partes.push(`${motivo}.`);
    if (texto.trim()) partes.push(texto.trim());
    return partes.join(' ');
  })();

  const podeEnviar = status === 'agendado' ? !!hora : status === 'aberto' ? true : !!motivo || texto.trim().length > 0;

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      const lead = await Api.registrarResultado(params.id, { status, observacao: composta || undefined });
      useLeads.getState().aplicarResultado(lead);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast(`${STATUS_LABEL[status]} · ${lead.cliente.nome}`, 'sucesso', STATUS_ICONE[status]);
      if (notificacoes) avisarResultado(lead.cliente.nome, STATUS_LABEL[status]).catch(() => undefined);
      router.back();
    } catch (e) {
      const n = normalizarErro(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setErro(n.semConexao ? 'Sem conexão: o resultado não foi salvo. Tente de novo quando a rede voltar.' : (n.detalhes?.observacao ?? n.mensagem));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Faixa
        sobretitulo="Registrar resultado"
        titulo={TITULO[status]}
        subtitulo={params.nome}
        direita={<BotaoIcone icone="close" rotulo="Cancelar" onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        {status === 'agendado' ? (
          <>
            <Bloco titulo="Dia">
              <View style={styles.grade}>
                {dias.map((d, i) => (
                  <Chip key={d.rotulo} rotulo={d.rotulo} ativo={dia === i} cor={cor} onPress={() => setDia(i)} />
                ))}
              </View>
            </Bloco>
            <Bloco titulo="Horário na oficina">
              <View style={styles.grade}>
                {HORARIOS.map((h) => (
                  <Chip key={h} rotulo={h} icone="clock-outline" ativo={hora === h} cor={cor} onPress={() => setHora(h)} testID={`hora-${h}`} />
                ))}
              </View>
            </Bloco>
          </>
        ) : (
          <Bloco titulo={status === 'aberto' ? 'Por que reabrir' : 'O que aconteceu'}>
            <View style={styles.grade}>
              {(MOTIVOS[status] ?? []).map((m) => (
                <Chip key={m} rotulo={m} ativo={motivo === m} cor={cor} onPress={() => setMotivo(motivo === m ? null : m)} />
              ))}
            </View>
          </Bloco>
        )}

        <Bloco titulo="Observação (opcional)">
          <TextInput
            value={texto}
            onChangeText={(v) => setTexto(v.slice(0, LIMITE))}
            placeholder={status === 'agendado' ? 'Ex.: cliente pediu consultor Rafael, vem com a esposa.' : 'Detalhe que ajuda o próximo contato.'}
            placeholderTextColor={t.textoFraco}
            multiline
            textAlignVertical="top"
            style={[styles.area, { color: t.texto, borderColor: t.borda, backgroundColor: t.superficie }]}
            accessibilityLabel="Observação"
          />
          <Texto variante="legenda" fraco style={{ alignSelf: 'flex-end' }}>
            {texto.length}/{LIMITE}
          </Texto>
        </Bloco>

        {composta ? (
          <View style={[styles.previa, { borderColor: t.borda, backgroundColor: t.superficieAlta }]}>
            <Texto variante="rotulo" fraco>
              Vai para o histórico do lead
            </Texto>
            <Texto>{composta}</Texto>
          </View>
        ) : null}

        {erro ? <Aviso tom="perigo" texto={erro} /> : null}

        <Botao
          titulo={status === 'aberto' ? 'Reabrir' : `Confirmar · ${STATUS_LABEL[status]}`}
          icone={STATUS_ICONE[status]}
          cor={cor}
          onPress={enviar}
          carregando={enviando}
          desabilitado={!podeEnviar}
          testID="registrar-confirmar"
        />
        {!podeEnviar ? (
          <Texto variante="legenda" fraco centro>
            {status === 'agendado' ? 'Escolha um horário para confirmar.' : 'Escolha um motivo ou escreva uma observação.'}
          </Texto>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: espaco.sm }}>
      <Texto variante="rotulo" suave>
        {titulo}
      </Texto>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: espaco.xl, gap: espaco.xl },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  area: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: raio.md,
    padding: espaco.md,
    fontFamily: fonte.regular,
    fontSize: 15,
  },
  previa: { borderWidth: 1, borderStyle: 'dashed', borderRadius: raio.md, padding: espaco.md, gap: 4 },
});
