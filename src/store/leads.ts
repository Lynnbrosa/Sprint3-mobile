import { create } from 'zustand';
import { Api } from '@/lib/api/endpoints';
import { normalizarErro, type ErroApp } from '@/lib/api/erros';
import { avisarLeadCritico, avisarResumoCriticos } from '@/lib/notificacoes';
import { Local } from '@/lib/storage';
import { useConfig } from '@/store/config';
import type { LeadDetail, LeadListItem, PrioridadeLead, StatusLead } from '@/types/api';

export interface FiltroLista {
  status: StatusLead;
  prioridade: PrioridadeLead | null;
}

interface CacheLista {
  itens: LeadListItem[];
  total: number;
  pagina: number;
  salvoEm: string;
}

const POR_PAGINA = 50;

function chaveCache(f: FiltroLista): string {
  return `previopls:cache:leads:${useConfig.getState().modo}:${f.status}:${f.prioridade ?? 'todas'}`;
}

export function chaveCacheLead(id: string): string {
  return `previopls:cache:lead:${useConfig.getState().modo}:${id}`;
}

interface LeadsState {
  filtro: FiltroLista;
  itens: LeadListItem[];
  total: number;
  pagina: number;
  carregando: boolean;
  atualizando: boolean;
  carregandoMais: boolean;
  erro: ErroApp | null;
  origem: 'rede' | 'cache' | null;
  atualizadoEm: string | null;

  carregar: (tipo?: 'inicial' | 'refresh') => Promise<void>;
  carregarMais: () => Promise<void>;
  definirFiltro: (parcial: Partial<FiltroLista>) => void;
  aplicarResultado: (lead: LeadDetail) => void;
  limpar: () => void;
}

async function conferirCriticos(itens: LeadListItem[]): Promise<void> {
  const { notificacoes, modo } = useConfig.getState();
  const chave = `previopls:criticos-vistos:${modo}`;
  const criticos = itens.filter((l) => l.prioridade === 'critica' && l.status === 'aberto');
  const vistos = await Local.ler<string[]>(chave);
  const novos = vistos ? criticos.filter((l) => !vistos.includes(l.id)) : criticos;
  await Local.gravar(chave, Array.from(new Set([...(vistos ?? []), ...criticos.map((l) => l.id)])));
  if (!notificacoes || novos.length === 0) return;

  // primeira carga não dispara 26 notificações de uma vez: manda um resumo
  if (!vistos || novos.length > 3) {
    await avisarResumoCriticos(novos.length);
    return;
  }
  for (const l of novos) await avisarLeadCritico(l.id, l.nomeCliente, l.modeloVeiculo);
}

let requisicaoAtual = 0;

export const useLeads = create<LeadsState>((set, get) => ({
  filtro: { status: 'aberto', prioridade: null },
  itens: [],
  total: 0,
  pagina: 0,
  carregando: false,
  atualizando: false,
  carregandoMais: false,
  erro: null,
  origem: null,
  atualizadoEm: null,

  carregar: async (tipo = 'inicial') => {
    const filtro = get().filtro;
    const id = ++requisicaoAtual;

    if (tipo === 'inicial') {
      const cache = await Local.ler<CacheLista>(chaveCache(filtro));
      if (id !== requisicaoAtual) return;
      set({
        carregando: !cache,
        erro: null,
        ...(cache ? { itens: cache.itens, total: cache.total, pagina: cache.pagina, origem: 'cache', atualizadoEm: cache.salvoEm } : { itens: [], total: 0, pagina: 0 }),
      });
    } else {
      set({ atualizando: true, erro: null });
    }

    try {
      const r = await Api.listarLeads({ status: filtro.status, prioridade: filtro.prioridade ?? undefined, page: 1, perPage: POR_PAGINA });
      // o usuário trocou de filtro no meio: descarta a resposta velha
      if (id !== requisicaoAtual) return;
      const agora = new Date().toISOString();
      set({ itens: r.items, total: r.total, pagina: 1, origem: 'rede', atualizadoEm: agora, erro: null });
      await Local.gravar<CacheLista>(chaveCache(filtro), { itens: r.items, total: r.total, pagina: 1, salvoEm: agora });
      if (filtro.status === 'aberto') conferirCriticos(r.items).catch(() => undefined);
    } catch (e) {
      if (id !== requisicaoAtual) return;
      set({ erro: normalizarErro(e) });
    } finally {
      if (id === requisicaoAtual) set({ carregando: false, atualizando: false });
    }
  },

  carregarMais: async () => {
    const { itens, total, pagina, carregandoMais, carregando, filtro } = get();
    if (carregandoMais || carregando || itens.length >= total || pagina === 0) return;
    const id = requisicaoAtual;
    set({ carregandoMais: true });
    try {
      const r = await Api.listarLeads({ status: filtro.status, prioridade: filtro.prioridade ?? undefined, page: pagina + 1, perPage: POR_PAGINA });
      if (id !== requisicaoAtual) return;
      const vistos = new Set(itens.map((l) => l.id));
      set({ itens: [...itens, ...r.items.filter((l) => !vistos.has(l.id))], total: r.total, pagina: pagina + 1 });
    } catch (e) {
      if (id === requisicaoAtual) set({ erro: normalizarErro(e) });
    } finally {
      set({ carregandoMais: false });
    }
  },

  definirFiltro: (parcial) => {
    set({ filtro: { ...get().filtro, ...parcial } });
    get().carregar('inicial');
  },

  aplicarResultado: (lead) => {
    const { itens, filtro, total } = get();
    const saiu = lead.status !== filtro.status;
    set({
      itens: saiu ? itens.filter((l) => l.id !== lead.id) : itens.map((l) => (l.id === lead.id ? { ...l, status: lead.status } : l)),
      total: saiu && itens.some((l) => l.id === lead.id) ? Math.max(0, total - 1) : total,
    });
    Local.gravar(chaveCacheLead(lead.id), lead);
    // os caches das outras abas de status ficaram velhos
    Local.apagarPrefixo(`previopls:cache:leads:${useConfig.getState().modo}:`).catch(() => undefined);
  },

  limpar: () => {
    requisicaoAtual++;
    set({ itens: [], total: 0, pagina: 0, erro: null, origem: null, atualizadoEm: null, filtro: { status: 'aberto', prioridade: null } });
  },
}));
