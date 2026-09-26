import { create } from 'zustand';
import { Api } from '@/lib/api/endpoints';
import { normalizarErro } from '@/lib/api/erros';
import { eventos, SESSAO_EXPIRADA } from '@/lib/eventos';
import { Sessao, type PerfilSessao } from '@/lib/sessao';
import { useConfig } from '@/store/config';
import type { Papel, UsuarioResponse } from '@/types/api';

type Situacao = 'carregando' | 'deslogado' | 'logado';

interface AuthState {
  situacao: Situacao;
  perfil: PerfilSessao | null;
  usuario: UsuarioResponse | null;
  tokenExpiraEm: string | null;
  aviso: string | null;

  iniciar: () => Promise<void>;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: (aviso?: string) => Promise<void>;
  carregarUsuario: () => Promise<void>;
  limparAviso: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  situacao: 'carregando',
  perfil: null,
  usuario: null,
  tokenExpiraEm: null,
  aviso: null,

  iniciar: async () => {
    const [token, perfil] = await Promise.all([Sessao.access(), Sessao.perfil()]);
    const { modo, apiUrl } = useConfig.getState();
    // trocou de servidor com a sessão aberta: o token antigo não vale no destino novo
    if (!token || !perfil || perfil.modo !== modo || (modo === 'api' && perfil.apiUrl !== apiUrl)) {
      await Sessao.limpar();
      set({ situacao: 'deslogado', perfil: null, usuario: null });
      return;
    }
    set({ situacao: 'logado', perfil });
    get().carregarUsuario();
  },

  entrar: async (email, senha) => {
    const { modo, apiUrl } = useConfig.getState();
    const r = await Api.login(email.trim().toLowerCase(), senha);
    await Sessao.salvarTokens(r.accessToken, r.refreshToken);
    const perfil: PerfilSessao = { email: email.trim().toLowerCase(), papel: r.role as Papel, modo, apiUrl };
    await Sessao.salvarPerfil(perfil);
    set({ situacao: 'logado', perfil, aviso: null });
    await get().carregarUsuario();
  },

  carregarUsuario: async () => {
    try {
      const s = await Api.me();
      const perfil = get().perfil;
      if (perfil && perfil.nome !== s.usuario.nome) {
        const atualizado = { ...perfil, nome: s.usuario.nome, papel: s.usuario.papel };
        await Sessao.salvarPerfil(atualizado);
        set({ perfil: atualizado });
      }
      set({ usuario: s.usuario, tokenExpiraEm: s.tokenExpiraEm });
    } catch (e) {
      // backend sem /v1/usuarios/me (versão da sprint 2) não impede o uso do app
      const err = normalizarErro(e);
      if (err.status !== 404) console.warn('me falhou', err.code);
    }
  },

  sair: async (aviso) => {
    const refresh = await Sessao.refresh();
    // revoga no servidor, mas sair não pode depender da rede
    try {
      if (get().situacao === 'logado') await Api.logout(refresh);
    } catch {
      // segue o logout local
    }
    await Sessao.limpar();
    set({ situacao: 'deslogado', perfil: null, usuario: null, tokenExpiraEm: null, aviso: aviso ?? null });
  },

  limparAviso: () => set({ aviso: null }),
}));

eventos.on(SESSAO_EXPIRADA, () => {
  if (useAuth.getState().situacao !== 'logado') return;
  useAuth.setState({
    situacao: 'deslogado',
    perfil: null,
    usuario: null,
    tokenExpiraEm: null,
    aviso: 'Sua sessão expirou. Entre de novo para continuar.',
  });
});
