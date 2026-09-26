// contrato do challenge-SOA (Spring Boot). enums chegam minúsculos por causa do @JsonValue.

export type Papel = 'admin' | 'consultor' | 'analista';
export type PerfilCliente = 'fiel' | 'abandono' | 'esquecido' | 'economico';
export type PrioridadeLead = 'critica' | 'alta' | 'media' | 'baixa';
export type StatusLead = 'aberto' | 'agendado' | 'recusado' | 'sem-contato';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  role: Papel;
  refreshToken?: string;
  refreshExpiresIn?: number;
}

export interface UsuarioResponse {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  criadoEm: string;
}

export interface SessaoResponse {
  usuario: UsuarioResponse;
  tokenExpiraEm: string;
}

export interface Veiculo {
  id: string;
  modelo: string;
  versao: string;
  ano: number;
  vin: string;
  dataCompra: string;
  valorCompra: string | number;
  concessionariaId: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email?: string | null;
  telefone?: string | null;
  regiao: string;
  perfil?: PerfilCliente | null;
  scoreRisco?: number | null;
  criadoEm: string;
  classificadoEm?: string | null;
  veiculos?: Veiculo[] | null;
}

export interface LeadListItem {
  id: string;
  clienteId: string;
  veiculoId: string;
  nomeCliente: string;
  modeloVeiculo: string;
  perfil?: PerfilCliente | null;
  scoreRisco: number;
  prioridade: PrioridadeLead;
  status: StatusLead;
  criadoEm: string;
}

export interface LeadListResponse {
  items: LeadListItem[];
  page: number;
  perPage: number;
  total: number;
}

export interface LeadDetail {
  id: string;
  scoreRisco: number;
  prioridade: PrioridadeLead;
  status: StatusLead;
  scriptOferta?: string | null;
  observacao?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  cliente: Cliente;
  veiculo: Veiculo;
}

export interface LeadPatchRequest {
  status: Exclude<StatusLead, 'aberto'> | 'aberto';
  observacao?: string;
}

export interface VeiculoRequest {
  modelo: string;
  versao: string;
  ano: number;
  vin: string;
  dataCompra: string;
  valorCompra: string;
  concessionariaId: string;
}

export interface ClienteCreateRequest {
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  regiao: string;
  veiculo: VeiculoRequest;
}

export interface ClienteCreatedResponse {
  cliente: Cliente;
  leadId: string | null;
  perfil: PerfilCliente;
  scoreRisco: number;
}

export interface HealthResponse {
  status: string;
  components?: Record<string, string>;
}

export interface VersionResponse {
  name: string;
  version: string;
  build: string;
}

export interface ErrorBody {
  status?: number;
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  path?: string;
  requestId?: string;
  timestamp?: string;
}

export interface ErrorResponse {
  error: ErrorBody;
}
