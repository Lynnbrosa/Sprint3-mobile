import { isAxiosError } from 'axios';
import type { ErrorResponse } from '@/types/api';

export interface ErroApp {
  status: number | null;
  code: string;
  mensagem: string;
  detalhes: Record<string, string> | null;
  semConexao: boolean;
  requestId?: string;
}

function ehEnvelope(dado: unknown): dado is ErrorResponse {
  return !!dado && typeof dado === 'object' && 'error' in dado && typeof (dado as ErrorResponse).error?.code === 'string';
}

// o backend manda {error:{code,message,details}}; aqui vira texto que o consultor entende
export function normalizarErro(e: unknown): ErroApp {
  if (!isAxiosError(e)) {
    return { status: null, code: 'ERRO_APP', mensagem: e instanceof Error ? e.message : 'Algo deu errado.', detalhes: null, semConexao: false };
  }

  if (!e.response) {
    const timeout = e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT';
    return {
      status: null,
      code: timeout ? 'TIMEOUT' : 'SEM_CONEXAO',
      mensagem: timeout
        ? 'O servidor demorou demais para responder. Tente de novo.'
        : 'Sem conexão com o servidor. Confira a internet ou o endereço da API em Servidor.',
      detalhes: null,
      semConexao: true,
    };
  }

  const status = e.response.status;
  const corpo = e.response.data;
  const env = ehEnvelope(corpo) ? corpo.error : null;
  const detalhes = env?.details
    ? Object.fromEntries(Object.entries(env.details).map(([k, v]) => [k, String(v)]))
    : null;

  const porStatus: Record<number, string> = {
    400: 'Requisição inválida.',
    401: 'Sessão inválida. Entre novamente.',
    403: 'Seu perfil não tem permissão para esta ação.',
    404: 'Registro não encontrado.',
    409: 'Esse registro já existe.',
    422: 'Confira os campos destacados.',
    429: 'Muitas tentativas em pouco tempo. Aguarde um minuto.',
  };

  return {
    status,
    code: env?.code ?? `HTTP_${status}`,
    mensagem: env?.message ?? porStatus[status] ?? `Erro no servidor (HTTP ${status}).`,
    detalhes,
    semConexao: false,
    requestId: env?.requestId,
  };
}
