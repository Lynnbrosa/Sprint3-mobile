import { Seguro } from './storage';
import type { ModoServidor } from '@/store/config';
import type { Papel } from '@/types/api';

const K_ACCESS = 'previopls.access';
const K_REFRESH = 'previopls.refresh';
const K_PERFIL = 'previopls.perfil';

export interface PerfilSessao {
  email: string;
  papel: Papel;
  nome?: string;
  // token do modo demo não pode ir pra API de verdade (e vice-versa)
  modo: ModoServidor;
  apiUrl: string;
}

export const Sessao = {
  access: () => Seguro.ler(K_ACCESS),
  refresh: () => Seguro.ler(K_REFRESH),

  async perfil(): Promise<PerfilSessao | null> {
    const bruto = await Seguro.ler(K_PERFIL);
    if (!bruto) return null;
    try {
      return JSON.parse(bruto) as PerfilSessao;
    } catch {
      return null;
    }
  },

  async salvarTokens(access: string, refresh?: string | null): Promise<void> {
    await Seguro.gravar(K_ACCESS, access);
    if (refresh) await Seguro.gravar(K_REFRESH, refresh);
  },

  async salvarPerfil(p: PerfilSessao): Promise<void> {
    await Seguro.gravar(K_PERFIL, JSON.stringify(p));
  },

  async limpar(): Promise<void> {
    await Promise.all([Seguro.apagar(K_ACCESS), Seguro.apagar(K_REFRESH), Seguro.apagar(K_PERFIL)]);
  },
};
