import { api } from './cliente';
import type {
  ClienteCreatedResponse,
  ClienteCreateRequest,
  HealthResponse,
  LeadDetail,
  LeadListResponse,
  LeadPatchRequest,
  LoginResponse,
  PrioridadeLead,
  SessaoResponse,
  StatusLead,
  VersionResponse,
} from '@/types/api';

export interface FiltroLeads {
  status?: StatusLead;
  prioridade?: PrioridadeLead;
  page?: number;
  perPage?: number;
}

export const Api = {
  async login(email: string, senha: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/v1/auth/login', { email, senha }, { semAuth: true });
    return data;
  },

  async logout(refreshToken: string | null): Promise<void> {
    await api.post('/v1/auth/logout', refreshToken ? { refreshToken } : undefined, { _renovado: true, timeout: 6000 });
  },

  async me(): Promise<SessaoResponse> {
    const { data } = await api.get<SessaoResponse>('/v1/usuarios/me');
    return data;
  },

  async listarLeads(f: FiltroLeads = {}): Promise<LeadListResponse> {
    const params: Record<string, string | number> = { page: f.page ?? 1, per_page: f.perPage ?? 50 };
    if (f.status) params.status = f.status;
    if (f.prioridade) params.prioridade = f.prioridade;
    const { data } = await api.get<LeadListResponse>('/v1/leads', { params });
    return data;
  },

  // o painel só precisa do total: per_page=1 e lê o campo total da página
  async contarLeads(f: Omit<FiltroLeads, 'page' | 'perPage'>): Promise<number> {
    const r = await Api.listarLeads({ ...f, page: 1, perPage: 1 });
    return r.total;
  },

  async obterLead(id: string): Promise<LeadDetail> {
    const { data } = await api.get<LeadDetail>(`/v1/leads/${encodeURIComponent(id)}`);
    return data;
  },

  async registrarResultado(id: string, corpo: LeadPatchRequest): Promise<LeadDetail> {
    const { data } = await api.patch<LeadDetail>(`/v1/leads/${encodeURIComponent(id)}`, corpo);
    return data;
  },

  async cadastrarVenda(corpo: ClienteCreateRequest): Promise<ClienteCreatedResponse> {
    const { data } = await api.post<ClienteCreatedResponse>('/v1/clientes', corpo);
    return data;
  },

  async health(): Promise<HealthResponse> {
    const { data } = await api.get<HealthResponse>('/health', { semAuth: true, timeout: 8000 });
    return data;
  },

  async version(): Promise<VersionResponse> {
    const { data } = await api.get<VersionResponse>('/version', { semAuth: true, timeout: 8000 });
    return data;
  },
};
