import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as Crypto from 'expo-crypto';
import { servidorDemo } from '@/demo/servidor';
import { eventos, SESSAO_EXPIRADA } from '@/lib/eventos';
import { expiraEm } from '@/lib/jwt';
import { Sessao } from '@/lib/sessao';
import { useConfig } from '@/store/config';
import type { LoginResponse } from '@/types/api';

declare module 'axios' {
  interface AxiosRequestConfig {
    // login/refresh não levam bearer e um 401 neles não dispara renovação
    semAuth?: boolean;
    _renovado?: boolean;
  }
}

export const api = axios.create({
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

let renovacaoEmCurso: Promise<string | null> | null = null;

// várias telas pedindo ao mesmo tempo com o token vencido = um refresh só.
// o backend rotaciona e o refresh token vale uma vez; dois refresh paralelos
// fariam o segundo cair como TOKEN_REVOKED e derrubar a sessão.
export function renovarSessao(): Promise<string | null> {
  if (!renovacaoEmCurso) {
    renovacaoEmCurso = (async () => {
      const refresh = await Sessao.refresh();
      if (!refresh) return null;
      try {
        const { data } = await api.post<LoginResponse>('/v1/auth/refresh', { refreshToken: refresh }, { semAuth: true });
        await Sessao.salvarTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      renovacaoEmCurso = null;
    });
  }
  return renovacaoEmCurso;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { modo, apiUrl } = useConfig.getState();
  config.baseURL = apiUrl;
  if (modo === 'demo') config.adapter = servidorDemo;
  config.headers.set('X-Request-Id', Crypto.randomUUID());

  if (!config.semAuth) {
    let token = await Sessao.access();
    const vence = expiraEm(token);
    // renova 30s antes de vencer pra não gastar uma requisição com 401
    if (token && vence && vence.getTime() - Date.now() < 30_000) {
      token = (await renovarSessao()) ?? token;
    }
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (erro: AxiosError) => {
    const cfg = erro.config;
    if (erro.response?.status === 401 && cfg && !cfg.semAuth && !cfg._renovado) {
      cfg._renovado = true;
      const novo = await renovarSessao();
      if (novo) return api(cfg);
      await Sessao.limpar();
      eventos.emit(SESSAO_EXPIRADA);
    }
    return Promise.reject(erro);
  },
);
