import axios, { AxiosError } from 'axios';
import { restaurarDemo, servidorDemo } from '@/demo/servidor';
import type { ClienteCreateRequest, ErrorResponse, LeadDetail, LeadListResponse, LoginResponse } from '@/types/api';

// o modo demonstração tem que responder igual ao challenge-SOA: mesmos códigos, mesmo envelope
const http = axios.create({ adapter: servidorDemo, baseURL: 'http://demo' });
const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

async function entrar(email = 'consultor@ford.com', senha = 'cons123'): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/v1/auth/login', { email, senha });
  return data;
}

async function falha(p: Promise<unknown>): Promise<{ status: number; corpo: ErrorResponse }> {
  try {
    await p;
  } catch (e) {
    const err = e as AxiosError<ErrorResponse>;
    return { status: err.response!.status, corpo: err.response!.data };
  }
  throw new Error('era para falhar');
}

function venda(parcial: Partial<ClienteCreateRequest['veiculo']> & { regiao?: string; cpf?: string } = {}): ClienteCreateRequest {
  const { regiao = 'SP', cpf = '12345678901', ...veiculo } = parcial;
  return {
    nome: 'Marina Duarte',
    cpf,
    regiao,
    veiculo: {
      modelo: 'Ranger',
      versao: 'XLT',
      ano: 2026,
      vin: '9BFZZZ8F7NB000001',
      dataCompra: '2026-09-20',
      valorCompra: '259900.00',
      concessionariaId: 'FORD-6632',
      ...veiculo,
    },
  };
}

beforeEach(async () => {
  await restaurarDemo();
});

describe('auth', () => {
  it('login devolve access + refresh e o papel em minúsculo', async () => {
    const r = await entrar();
    expect(r.tokenType).toBe('Bearer');
    expect(r.role).toBe('consultor');
    expect(r.expiresIn).toBe(3600);
    expect(r.refreshToken).toBeTruthy();
  });

  it('senha errada = 401 com o envelope padrão de erro', async () => {
    const { status, corpo } = await falha(entrar('consultor@ford.com', 'errada1'));
    expect(status).toBe(401);
    expect(corpo.error.code).toBe('UNAUTHORIZED');
    expect(corpo.error.message).toBe('Credenciais inválidas');
    expect(corpo.error.path).toBe('/v1/auth/login');
  });

  it('5 falhas seguidas bloqueiam o e-mail, mesmo com a senha certa depois', async () => {
    for (let i = 0; i < 5; i++) await falha(entrar('admin@ford.com', 'errada1'));
    const { status, corpo } = await falha(entrar('admin@ford.com', 'admin123'));
    expect(status).toBe(401);
    expect(corpo.error.message).toMatch(/bloqueada/);
  });

  it('sem bearer = 401 UNAUTHORIZED; token lixo = TOKEN_INVALID', async () => {
    expect((await falha(http.get('/v1/leads'))).corpo.error.code).toBe('UNAUTHORIZED');
    expect((await falha(http.get('/v1/leads', bearer('abc.def.ghi')))).corpo.error.code).toBe('TOKEN_INVALID');
  });

  it('refresh rotaciona: o refresh usado não vale uma segunda vez', async () => {
    const r = await entrar();
    const { data: novo } = await http.post<LoginResponse>('/v1/auth/refresh', { refreshToken: r.refreshToken });
    expect(novo.accessToken).not.toBe(r.accessToken);
    const repetido = await falha(http.post('/v1/auth/refresh', { refreshToken: r.refreshToken }));
    expect(repetido.status).toBe(401);
    expect(repetido.corpo.error.code).toBe('TOKEN_REVOKED');
  });

  it('access token vencido = TOKEN_EXPIRED', async () => {
    const r = await entrar();
    const [h, p] = r.accessToken.split('.');
    const claims = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    const vencido = `${h}.${btoa(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) - 5 }))}.demo`;
    expect((await falha(http.get('/v1/leads', bearer(vencido)))).corpo.error.code).toBe('TOKEN_EXPIRED');
  });

  it('logout revoga o access token na hora', async () => {
    const r = await entrar();
    const res = await http.post('/v1/auth/logout', { refreshToken: r.refreshToken }, bearer(r.accessToken));
    expect(res.status).toBe(204);
    expect((await falha(http.get('/v1/leads', bearer(r.accessToken)))).corpo.error.code).toBe('TOKEN_REVOKED');
  });

  it('/v1/usuarios/me devolve o dono do token', async () => {
    const r = await entrar('analista@ford.com', 'analista123');
    const { data } = await http.get('/v1/usuarios/me', bearer(r.accessToken));
    expect(data.usuario).toMatchObject({ email: 'analista@ford.com', papel: 'analista', nome: 'Ana Analista' });
    expect(data.usuario.senha).toBeUndefined();
  });
});

describe('leads', () => {
  it('lista 93 abertos, crítica primeiro e score decrescente dentro da prioridade', async () => {
    const r = await entrar();
    const { data } = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { status: 'aberto', per_page: 100 } });
    expect(data.total).toBe(93);
    const ordem = { critica: 0, alta: 1, media: 2, baixa: 3 };
    for (let i = 1; i < data.items.length; i++) {
      const a = data.items[i - 1];
      const b = data.items[i];
      expect(ordem[a.prioridade] <= ordem[b.prioridade]).toBe(true);
      if (a.prioridade === b.prioridade) expect(a.scoreRisco >= b.scoreRisco).toBe(true);
    }
  });

  it('filtro de prioridade + paginação respeitam o total', async () => {
    const r = await entrar();
    const p1 = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { prioridade: 'critica', per_page: 10, page: 1 } });
    const p3 = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { prioridade: 'critica', per_page: 10, page: 3 } });
    expect(p1.data.total).toBe(26);
    expect(p1.data.items).toHaveLength(10);
    expect(p3.data.items).toHaveLength(6);
    expect(p1.data.items.every((l) => l.prioridade === 'critica')).toBe(true);
  });

  it('lead inexistente = 404 NOT_FOUND', async () => {
    const r = await entrar();
    const { status, corpo } = await falha(http.get('/v1/leads/nao-existe', bearer(r.accessToken)));
    expect(status).toBe(404);
    expect(corpo.error.code).toBe('NOT_FOUND');
  });

  it('analista lê a visão 360 mas leva 403 ao registrar resultado', async () => {
    const r = await entrar('analista@ford.com', 'analista123');
    const { data } = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { per_page: 1 } });
    const id = data.items[0].id;
    await expect(http.get(`/v1/leads/${id}`, bearer(r.accessToken))).resolves.toBeTruthy();
    const { status } = await falha(http.patch(`/v1/leads/${id}`, { status: 'agendado' }, bearer(r.accessToken)));
    expect(status).toBe(403);
  });

  it('consultor agenda: status muda, observação fica e o lead sai dos abertos', async () => {
    const r = await entrar();
    const { data } = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { status: 'aberto', per_page: 1 } });
    const id = data.items[0].id;
    const { data: lead } = await http.patch<LeadDetail>(`/v1/leads/${id}`, { status: 'agendado', observacao: 'Revisão 28/09 às 09:30.' }, bearer(r.accessToken));
    expect(lead.status).toBe('agendado');
    expect(lead.observacao).toBe('Revisão 28/09 às 09:30.');
    const abertos = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { status: 'aberto', per_page: 1 } });
    const agendados = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { status: 'agendado', per_page: 1 } });
    expect(abertos.data.total).toBe(92);
    expect(agendados.data.items[0].id).toBe(id);
  });

  it('status fora do enum = 422 VALIDATION_ERROR com details', async () => {
    const r = await entrar();
    const { data } = await http.get<LeadListResponse>('/v1/leads', { ...bearer(r.accessToken), params: { per_page: 1 } });
    const { status, corpo } = await falha(http.patch(`/v1/leads/${data.items[0].id}`, { status: 'vendido' }, bearer(r.accessToken)));
    expect(status).toBe(422);
    expect(corpo.error.details).toHaveProperty('status');
  });
});

describe('cadastro D0 (POST /v1/clientes)', () => {
  it('classifica igual ao MlService.classificarLocal do backend', async () => {
    const r = await entrar('admin@ford.com', 'admin123');
    // valores calculados com o mesmo sha256 do Java: FORD-6632|Ranger|XLT|SP -> fiel 0.219
    const { data, status } = await http.post('/v1/clientes', venda(), bearer(r.accessToken));
    expect(status).toBe(201);
    expect(data.perfil).toBe('fiel');
    expect(data.scoreRisco).toBeCloseTo(0.219, 3);
    expect(data.leadId).toBeNull();
    expect(data.cliente.cpf).toBe('123.***.***-01');
  });

  it('perfil de risco gera lead com a prioridade derivada do score', async () => {
    const r = await entrar('admin@ford.com', 'admin123');
    const corpo = venda({ modelo: 'Maverick', versao: 'Lariat', concessionariaId: 'FORD-6689', regiao: 'RJ', vin: '9BFZZZ8F7NB000002' });
    const { data } = await http.post('/v1/clientes', corpo, bearer(r.accessToken));
    expect(data.perfil).toBe('esquecido');
    expect(data.scoreRisco).toBeCloseTo(0.648, 3);
    const { data: lead } = await http.get<LeadDetail>(`/v1/leads/${data.leadId}`, bearer(r.accessToken));
    expect(lead.prioridade).toBe('media');
    expect(lead.scriptOferta).toMatch(/esquecido/i);
  });

  it('só admin cadastra; VIN com I/O/Q = 422; VIN repetido = 409', async () => {
    const consultor = await entrar();
    expect((await falha(http.post('/v1/clientes', venda(), bearer(consultor.accessToken)))).status).toBe(403);

    const admin = await entrar('admin@ford.com', 'admin123');
    const invalido = await falha(http.post('/v1/clientes', venda({ vin: '9BFZZZ8F7NB00000O' }), bearer(admin.accessToken)));
    expect(invalido.status).toBe(422);
    expect(invalido.corpo.error.details).toHaveProperty(['veiculo.vin']);

    await http.post('/v1/clientes', venda(), bearer(admin.accessToken));
    const repetido = await falha(http.post('/v1/clientes', venda({ cpf: '99999999999' }), bearer(admin.accessToken)));
    expect(repetido.status).toBe(409);
  });
});
