import { create } from 'zustand';
import { Local } from '@/lib/storage';

export type ModoServidor = 'demo' | 'api';
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

const CHAVE = 'previopls:config:v1';

// build com EXPO_PUBLIC_API_URL já nasce apontando pra API; sem ela o APK abre no modo demonstração
const URL_BUILD = process.env.EXPO_PUBLIC_API_URL?.trim();
export const URL_PADRAO = URL_BUILD || 'http://10.0.2.2:5000';

interface Persistido {
  modo: ModoServidor;
  apiUrl: string;
  tema: PreferenciaTema;
  notificacoes: boolean;
}

interface ConfigState extends Persistido {
  hidratado: boolean;
  hidratar: () => Promise<void>;
  definirServidor: (modo: ModoServidor, apiUrl: string) => Promise<void>;
  definirTema: (tema: PreferenciaTema) => Promise<void>;
  definirNotificacoes: (ligado: boolean) => Promise<void>;
}

const padrao: Persistido = {
  modo: URL_BUILD ? 'api' : 'demo',
  apiUrl: URL_PADRAO,
  tema: 'sistema',
  notificacoes: true,
};

export function normalizarUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

export const useConfig = create<ConfigState>((set, get) => {
  const salvar = async () => {
    const { modo, apiUrl, tema, notificacoes } = get();
    await Local.gravar<Persistido>(CHAVE, { modo, apiUrl, tema, notificacoes });
  };

  return {
    ...padrao,
    hidratado: false,

    hidratar: async () => {
      const salvo = await Local.ler<Partial<Persistido>>(CHAVE);
      set({ ...padrao, ...(salvo ?? {}), hidratado: true });
    },

    definirServidor: async (modo, apiUrl) => {
      set({ modo, apiUrl: normalizarUrl(apiUrl) || URL_PADRAO });
      await salvar();
    },

    definirTema: async (tema) => {
      set({ tema });
      await salvar();
    },

    definirNotificacoes: async (notificacoes) => {
      set({ notificacoes });
      await salvar();
    },
  };
});
