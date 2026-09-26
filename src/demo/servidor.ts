import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as Crypto from 'expo-crypto';
import { Local } from '@/lib/storage';
import type {
  Cliente,
  ClienteCreateRequest,
  ClienteCreatedResponse,
  LeadDetail,
  LeadListItem,
  Papel,
  PerfilCliente,
  PrioridadeLead,
  StatusLead,
  Veiculo,
} from '@/types/api';
import seedBruto from './seed.json';

// modo demonstração: implementa o mesmo contrato do challenge-SOA como adapter do axios.
// o app inteiro (interceptors, refresh, tratamento de erro) roda igual; só o transporte muda.

interface SeedLead {
  id: string;
  scoreRisco: number;
  prioridade: PrioridadeLead;
  status: StatusLead;
  scriptOferta: string;
  diasAtras: number;
  cliente: Omit<Cliente, 'criadoEm'>;
  veiculo: Veiculo;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
  criadoEm: string;
}

interface Estado {
  inicio: number;
  alteracoes: Record<string, { status: StatusLead; observacao: string | null; atualizadoEm: string }>;
  novos: LeadDetail[];
  cadastrados: { cpf: string; vin: string }[];
  revogados: string[];
  falhas: Record<string, number[]>;
}

const CHAVE = 'previopls:demo:v1';
const ACCESS_TTL = 60 * 60;
const REFRESH_TTL = 8 * 60 * 60;
const ORDEM: Record<PrioridadeLead, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const STATUS_VALIDOS: StatusLead[] = ['aberto', 'agendado', 'recusado', 'sem-contato'];

// mesmos usuários do DataSeeder do backend
const USUARIOS: Usuario[] = [
  { id: 'a0c4f0de-0000-4000-8000-000000000001', nome: 'Admin Ford', email: 'admin@ford.com', senha: 'admin123', papel: 'admin', criadoEm: '2026-05-13T12:00:00Z' },
  { id: 'a0c4f0de-0000-4000-8000-000000000002', nome: 'Carlos Consultor', email: 'consultor@ford.com', senha: 'cons123', papel: 'consultor', criadoEm: '2026-05-13T12:00:00Z' },
  { id: 'a0c4f0de-0000-4000-8000-000000000003', nome: 'Ana Analista', email: 'analista@ford.com', senha: 'analista123', papel: 'analista', criadoEm: '2026-05-13T12:00:00Z' },
];

const SCRIPTS: Record<PerfilCliente, string> = {
  fiel: 'Cliente fiel — oferecer pacote de manutenção preventiva premium e enfatizar histórico de relacionamento com a marca.',
  abandono: 'Cliente de alto risco de evasão — oferta agressiva de primeira revisão com desconto + brinde institucional. Abordar antes da 1ª revisão.',
  esquecido: 'Cliente esquecido — lembrete proativo de manutenção + agendamento facilitado. Oferecer combo revisão + lavagem.',
  economico: 'Cliente sensível a preço — apresentar oferta promocional com parcelamento e comparativo de custo total de propriedade.',
};

let estado: Estado | null = null;
let base: LeadDetail[] | null = null;

async function carregar(): Promise<Estado> {
  if (estado) return estado;
  const salvo = await Local.ler<Estado>(CHAVE);
  estado = salvo ?? { inicio: Date.now(), alteracoes: {}, novos: [], cadastrados: [], revogados: [], falhas: {} };
  if (!salvo) await Local.gravar(CHAVE, estado);
  return estado;
}

async function persistir(): Promise<void> {
  if (estado) await Local.gravar(CHAVE, estado);
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function leadsBase(inicio: number): LeadDetail[] {
  if (base) return base;
  base = (seedBruto as SeedLead[]).map((s) => {
    // a data de criação fica presa ao primeiro uso da demo, senão a lista "anda" a cada abertura
    const horas = hashNum(s.id) % 10;
    const criado = new Date(inicio - s.diasAtras * 86_400_000 - horas * 3_600_000).toISOString();
    return {
      id: s.id,
      scoreRisco: s.scoreRisco,
      prioridade: s.prioridade,
      status: s.status,
      scriptOferta: s.scriptOferta,
      observacao: null,
      criadoEm: criado,
      atualizadoEm: criado,
      cliente: { ...s.cliente, criadoEm: criado, classificadoEm: criado, veiculos: null },
      veiculo: s.veiculo,
    };
  });
  return base;
}

function todos(e: Estado): LeadDetail[] {
  return [...e.novos, ...leadsBase(e.inicio)].map((l) => {
    const alt = e.alteracoes[l.id];
    return alt ? { ...l, ...alt } : l;
  });
}

function paraItem(l: LeadDetail): LeadListItem {
  return {
    id: l.id,
    clienteId: l.cliente.id,
    veiculoId: l.veiculo.id,
    nomeCliente: l.cliente.nome,
    // mesmo formato do LeadMapper do backend: modelo + versão
    modeloVeiculo: `${l.veiculo.modelo} ${l.veiculo.versao}`,
    perfil: l.cliente.perfil ?? null,
    scoreRisco: l.scoreRisco,
    prioridade: l.prioridade,
    status: l.status,
    criadoEm: l.criadoEm,
  };
}

// ---------- tokens ----------

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function emitirToken(u: Usuario, tipo: 'access' | 'refresh'): string {
  const agora = Math.floor(Date.now() / 1000);
  const ttl = tipo === 'access' ? ACCESS_TTL : REFRESH_TTL;
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    iss: 'previopls-demo',
    sub: u.id,
    role: u.papel,
    typ: tipo,
    jti: Crypto.randomUUID(),
    iat: agora,
    exp: agora + ttl,
  })}.demo`;
}

interface Claims {
  sub: string;
  role: Papel;
  typ: 'access' | 'refresh';
  jti: string;
  exp: number;
}

function lerToken(token: string | undefined | null): Claims | null {
  if (!token) return null;
  const p = token.split('.');
  if (p.length !== 3 || p[2] !== 'demo') return null;
  try {
    let b = p[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    return JSON.parse(atob(b)) as Claims;
  } catch {
    return null;
  }
}

function parLogin(u: Usuario) {
  return {
    accessToken: emitirToken(u, 'access'),
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL,
    role: u.papel,
    refreshToken: emitirToken(u, 'refresh'),
    refreshExpiresIn: REFRESH_TTL,
  };
}

// ---------- respostas ----------

class Falha extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string>,
  ) {
    super(message);
  }
}

function autenticar(cfg: InternalAxiosRequestConfig, e: Estado): Usuario {
  const auth = String(cfg.headers.get('Authorization') ?? '');
  if (!auth.startsWith('Bearer ')) throw new Falha(401, 'UNAUTHORIZED', 'Autenticação necessária (header Authorization: Bearer <token>)');
  const c = lerToken(auth.slice(7));
  if (!c || c.typ !== 'access') throw new Falha(401, 'TOKEN_INVALID', 'Token inválido');
  if (c.exp * 1000 < Date.now()) throw new Falha(401, 'TOKEN_EXPIRED', 'Token expirado');
  if (e.revogados.includes(c.jti)) throw new Falha(401, 'TOKEN_REVOKED', 'Token revogado');
  const u = USUARIOS.find((x) => x.id === c.sub);
  if (!u) throw new Falha(401, 'TOKEN_INVALID', 'Token inválido');
  return u;
}

function exigir(u: Usuario, papeis: Papel[]): void {
  if (!papeis.includes(u.papel)) throw new Falha(403, 'FORBIDDEN', 'Acesso negado para o seu perfil');
}

function corpo<T>(cfg: InternalAxiosRequestConfig): T {
  if (typeof cfg.data === 'string' && cfg.data) return JSON.parse(cfg.data) as T;
  return (cfg.data ?? {}) as T;
}

function rota(cfg: InternalAxiosRequestConfig): string {
  const url = cfg.url ?? '';
  return url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
}

async function sha256(s: string): Promise<number[]> {
  const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s, { encoding: Crypto.CryptoEncoding.HEX });
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16)];
}

// porta do MlService.classificarLocal: mesmo hash, mesmo perfil que o backend daria
async function classificar(req: ClienteCreateRequest): Promise<{ perfil: PerfilCliente; score: number }> {
  const v = req.veiculo;
  const [b0, b1] = await sha256(`${v.concessionariaId}|${v.modelo}|${v.versao}|${req.regiao}`);
  const bucket = b0 % 100;
  const baseScore = b1 / 255;
  const r = (x: number) => Math.round(x * 1000) / 1000;
  if (bucket < 35) return { perfil: 'fiel', score: r(0.1 + baseScore * 0.2) };
  if (bucket < 60) return { perfil: 'economico', score: r(0.3 + baseScore * 0.25) };
  if (bucket < 85) return { perfil: 'esquecido', score: r(0.55 + baseScore * 0.2) };
  return { perfil: 'abandono', score: r(0.78 + baseScore * 0.22) };
}

function prioridade(score: number): PrioridadeLead {
  if (score >= 0.85) return 'critica';
  if (score >= 0.65) return 'alta';
  if (score >= 0.4) return 'media';
  return 'baixa';
}

function validarVenda(req: ClienteCreateRequest): void {
  const d: Record<string, string> = {};
  const v = req.veiculo ?? ({} as ClienteCreateRequest['veiculo']);
  if (!req.nome || req.nome.trim().length < 2) d.nome = 'nome obrigatório';
  if (!/^\d{11}$/.test(req.cpf ?? '')) d.cpf = 'CPF deve conter 11 dígitos numéricos';
  if (req.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(req.email)) d.email = 'email inválido';
  if (!req.regiao || req.regiao.length < 2) d.regiao = 'região obrigatória';
  if (!v.modelo) d['veiculo.modelo'] = 'modelo obrigatório';
  if (!v.versao) d['veiculo.versao'] = 'versão obrigatória';
  if (!v.ano || v.ano < 2000 || v.ano > 2100) d['veiculo.ano'] = 'ano entre 2000 e 2100';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v.vin ?? '')) d['veiculo.vin'] = 'VIN inválido (17 caracteres, sem I/O/Q)';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.dataCompra ?? '')) d['veiculo.dataCompra'] = 'data inválida';
  if (!(Number(v.valorCompra) >= 0)) d['veiculo.valorCompra'] = 'valor inválido';
  if (!v.concessionariaId) d['veiculo.concessionariaId'] = 'concessionária obrigatória';
  if (Object.keys(d).length) throw new Falha(422, 'VALIDATION_ERROR', 'Dados inválidos', d);
}

function mascarar(req: ClienteCreateRequest) {
  const email = req.email ? `${req.email[0]}***${req.email.slice(req.email.indexOf('@'))}` : null;
  const tel = req.telefone && req.telefone.length >= 4 ? `****${req.telefone.slice(-4)}` : null;
  return { cpf: `${req.cpf.slice(0, 3)}.***.***-${req.cpf.slice(9)}`, email, telefone: tel };
}

async function tratar(cfg: InternalAxiosRequestConfig): Promise<{ status: number; data: unknown }> {
  const e = await carregar();
  const metodo = (cfg.method ?? 'get').toUpperCase();
  const r = rota(cfg);

  if (metodo === 'GET' && r === '/health') {
    return { status: 200, data: { status: 'ok', components: { database: 'up', modo: 'demonstracao' } } };
  }
  if (metodo === 'GET' && r === '/version') {
    return { status: 200, data: { name: 'previopls-demo', version: 'v1', build: 'offline' } };
  }

  if (metodo === 'POST' && r === '/v1/auth/login') {
    const { email = '', senha = '' } = corpo<{ email?: string; senha?: string }>(cfg);
    const chave = email.trim().toLowerCase();
    if (!chave || !senha) {
      throw new Falha(422, 'VALIDATION_ERROR', 'Dados inválidos', {
        ...(chave ? {} : { email: 'email obrigatório' }),
        ...(senha ? {} : { senha: 'senha obrigatória' }),
      });
    }
    const janela = Date.now() - 15 * 60_000;
    const falhas = (e.falhas[chave] ?? []).filter((t) => t > janela);
    if (falhas.length >= 5) {
      throw new Falha(401, 'UNAUTHORIZED', 'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em alguns minutos.');
    }
    const u = USUARIOS.find((x) => x.email === chave);
    if (!u || u.senha !== senha) {
      e.falhas[chave] = [...falhas, Date.now()];
      await persistir();
      throw new Falha(401, 'UNAUTHORIZED', 'Credenciais inválidas');
    }
    delete e.falhas[chave];
    await persistir();
    return { status: 200, data: parLogin(u) };
  }

  if (metodo === 'POST' && r === '/v1/auth/refresh') {
    const { refreshToken } = corpo<{ refreshToken?: string }>(cfg);
    const c = lerToken(refreshToken);
    if (!c || c.typ !== 'refresh') throw new Falha(401, 'TOKEN_INVALID', 'Token inválido');
    if (c.exp * 1000 < Date.now()) throw new Falha(401, 'TOKEN_EXPIRED', 'Token expirado');
    if (e.revogados.includes(c.jti)) throw new Falha(401, 'TOKEN_REVOKED', 'Token revogado');
    const u = USUARIOS.find((x) => x.id === c.sub);
    if (!u) throw new Falha(401, 'TOKEN_INVALID', 'Token inválido');
    e.revogados.push(c.jti);
    await persistir();
    return { status: 200, data: parLogin(u) };
  }

  const u = autenticar(cfg, e);

  if (metodo === 'POST' && r === '/v1/auth/logout') {
    const access = lerToken(String(cfg.headers.get('Authorization')).slice(7));
    const { refreshToken } = corpo<{ refreshToken?: string }>(cfg);
    const refresh = lerToken(refreshToken);
    if (access) e.revogados.push(access.jti);
    if (refresh) e.revogados.push(refresh.jti);
    e.revogados = e.revogados.slice(-200);
    await persistir();
    return { status: 204, data: '' };
  }

  if (metodo === 'GET' && r === '/v1/usuarios/me') {
    const access = lerToken(String(cfg.headers.get('Authorization')).slice(7));
    const { senha: _senha, ...publico } = u;
    return { status: 200, data: { usuario: publico, tokenExpiraEm: new Date((access?.exp ?? 0) * 1000).toISOString() } };
  }

  if (metodo === 'GET' && r === '/v1/leads') {
    exigir(u, ['consultor', 'admin', 'analista']);
    const p = (cfg.params ?? {}) as Record<string, string | number | undefined>;
    const page = Math.max(1, Number(p.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(p.per_page ?? 20)));
    const lista = todos(e)
      .filter((l) => !p.status || l.status === p.status)
      .filter((l) => !p.prioridade || l.prioridade === p.prioridade)
      .sort(
        (a, b) =>
          ORDEM[a.prioridade] - ORDEM[b.prioridade] ||
          b.scoreRisco - a.scoreRisco ||
          b.criadoEm.localeCompare(a.criadoEm),
      );
    const fatia = lista.slice((page - 1) * perPage, page * perPage).map(paraItem);
    return { status: 200, data: { items: fatia, page, perPage, total: lista.length } };
  }

  const mLead = r.match(/^\/v1\/leads\/([^/]+)$/);
  if (mLead) {
    const id = decodeURIComponent(mLead[1]);
    const lead = todos(e).find((l) => l.id === id);
    if (metodo === 'GET') {
      exigir(u, ['consultor', 'admin', 'analista']);
      if (!lead) throw new Falha(404, 'NOT_FOUND', 'Lead não encontrado');
      return { status: 200, data: lead };
    }
    if (metodo === 'PATCH') {
      exigir(u, ['consultor', 'admin']);
      if (!lead) throw new Falha(404, 'NOT_FOUND', 'Lead não encontrado');
      const { status, observacao } = corpo<{ status?: StatusLead; observacao?: string }>(cfg);
      if (!status || !STATUS_VALIDOS.includes(status)) {
        throw new Falha(422, 'VALIDATION_ERROR', 'Dados inválidos', { status: 'status inválido' });
      }
      if (observacao && observacao.length > 2000) {
        throw new Falha(422, 'VALIDATION_ERROR', 'Dados inválidos', { observacao: 'máximo de 2000 caracteres' });
      }
      e.alteracoes[id] = { status, observacao: observacao?.trim() || lead.observacao || null, atualizadoEm: new Date().toISOString() };
      await persistir();
      return { status: 200, data: { ...lead, ...e.alteracoes[id] } };
    }
  }

  if (metodo === 'POST' && r === '/v1/clientes') {
    exigir(u, ['admin']);
    const req = corpo<ClienteCreateRequest>(cfg);
    validarVenda(req);
    if (e.cadastrados.some((c) => c.cpf === req.cpf)) throw new Falha(409, 'CONFLICT', 'CPF já cadastrado');
    if (todos(e).some((l) => l.veiculo.vin === req.veiculo.vin) || e.cadastrados.some((c) => c.vin === req.veiculo.vin)) {
      throw new Falha(409, 'CONFLICT', 'VIN já cadastrado');
    }
    return { status: 201, data: await registrarVenda(e, req) };
  }

  throw new Falha(404, 'NOT_FOUND', 'Recurso não encontrado');
}

async function registrarVenda(e: Estado, req: ClienteCreateRequest): Promise<ClienteCreatedResponse> {
  const { perfil, score } = await classificar(req);
  const agora = new Date().toISOString();
  const pii = mascarar(req);
  const cliente: Cliente = {
    id: Crypto.randomUUID(),
    nome: req.nome.trim(),
    cpf: pii.cpf,
    email: pii.email,
    telefone: pii.telefone,
    regiao: req.regiao,
    perfil,
    scoreRisco: score,
    criadoEm: agora,
    classificadoEm: agora,
  };
  const veiculo: Veiculo = { id: Crypto.randomUUID(), ...req.veiculo };
  let leadId: string | null = null;
  if (perfil === 'abandono' || perfil === 'esquecido') {
    leadId = Crypto.randomUUID();
    e.novos.unshift({
      id: leadId,
      scoreRisco: score,
      prioridade: prioridade(score),
      status: 'aberto',
      scriptOferta: SCRIPTS[perfil],
      observacao: null,
      criadoEm: agora,
      atualizadoEm: agora,
      cliente,
      veiculo,
    });
  }
  e.cadastrados.push({ cpf: req.cpf, vin: req.veiculo.vin });
  await persistir();
  return { cliente: { ...cliente, veiculos: [veiculo] }, leadId, perfil, scoreRisco: score };
}

function atraso(): Promise<void> {
  return new Promise((ok) => setTimeout(ok, 180 + Math.random() * 260));
}

export const servidorDemo: AxiosAdapter = async (cfg) => {
  await atraso();
  const headers = new AxiosHeaders({ 'content-type': 'application/json', 'x-request-id': String(cfg.headers.get('X-Request-Id') ?? '') });
  try {
    const { status, data } = await tratar(cfg);
    return { data, status, statusText: String(status), headers, config: cfg, request: {} } satisfies AxiosResponse;
  } catch (err) {
    if (!(err instanceof Falha)) throw err;
    const resposta: AxiosResponse = {
      data: {
        error: {
          status: err.status,
          code: err.code,
          message: err.message,
          details: err.details ?? null,
          path: rota(cfg),
          requestId: headers.get('x-request-id'),
          timestamp: new Date().toISOString(),
        },
      },
      status: err.status,
      statusText: err.code,
      headers,
      config: cfg,
      request: {},
    };
    throw new AxiosError(err.message, err.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, cfg, {}, resposta);
  }
};

// ---------- ferramentas da demonstração (fora do contrato) ----------

const NOMES = ['Juliana Barros', 'Rafael Nogueira', 'Camila Teixeira', 'Diego Moreira', 'Larissa Cardoso', 'Thiago Azevedo', 'Renata Campos', 'Bruno Farias'];
const LOJAS = ['FORD-6689', 'FORD-6674', 'FORD-6601', 'FORD-6632', 'FORD-6710'];

export function gerarVin(): string {
  const alfabeto = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let v = '9BF';
  while (v.length < 17) v += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return v;
}

export function gerarCpf(): string {
  let c = '';
  while (c.length < 11) c += Math.floor(Math.random() * 10);
  return c;
}

// simula o faturamento mandando uma venda que o modelo classifica como risco,
// pra mostrar a notificação de lead crítico chegando no celular do consultor
export async function simularVendaDeRisco(): Promise<LeadDetail | null> {
  const e = await carregar();
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const req: ClienteCreateRequest = {
      nome: NOMES[Math.floor(Math.random() * NOMES.length)],
      cpf: gerarCpf(),
      email: 'cliente@exemplo.com',
      telefone: `119${Math.floor(10000000 + Math.random() * 89999999)}`,
      regiao: ['SP', 'RJ', 'MG', 'PR', 'RS'][Math.floor(Math.random() * 5)],
      veiculo: {
        modelo: ['Ranger', 'Maverick', 'Territory', 'Bronco Sport'][Math.floor(Math.random() * 4)],
        versao: ['XLS', 'XLT', 'Limited', 'Storm', 'Lariat'][Math.floor(Math.random() * 5)],
        ano: 2026,
        vin: gerarVin(),
        dataCompra: new Date().toISOString().slice(0, 10),
        valorCompra: String(180000 + Math.floor(Math.random() * 120000)),
        concessionariaId: LOJAS[Math.floor(Math.random() * LOJAS.length)],
      },
    };
    const { perfil, score } = await classificar(req);
    if (perfil === 'abandono' && prioridade(score) === 'critica') {
      const r = await registrarVenda(e, req);
      return e.novos.find((l) => l.id === r.leadId) ?? null;
    }
  }
  return null;
}

export async function restaurarDemo(): Promise<void> {
  estado = null;
  base = null;
  await Local.apagar(CHAVE);
}
