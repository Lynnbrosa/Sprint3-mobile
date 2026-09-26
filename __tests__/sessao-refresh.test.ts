import { Api } from '@/lib/api/endpoints';
import { eventos, SESSAO_EXPIRADA } from '@/lib/eventos';
import { Sessao } from '@/lib/sessao';
import { restaurarDemo } from '@/demo/servidor';
import { useConfig } from '@/store/config';

// o cliente http de verdade, rodando contra o servidor demo (modo padrão sem EXPO_PUBLIC_API_URL)

function vencer(token: string): string {
  const [h, p] = token.split('.');
  const claims = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
  return `${h}.${btoa(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) - 5 }))}.demo`;
}

beforeEach(async () => {
  await restaurarDemo();
  await Sessao.limpar();
  jest.restoreAllMocks();
  expect(useConfig.getState().modo).toBe('demo');
});

it('token vencido + três telas pedindo ao mesmo tempo = um refresh só', async () => {
  const r = await Api.login('consultor@ford.com', 'cons123');
  await Sessao.salvarTokens(vencer(r.accessToken), r.refreshToken);
  const salvar = jest.spyOn(Sessao, 'salvarTokens');

  const respostas = await Promise.all([
    Api.listarLeads({ status: 'aberto' }),
    Api.contarLeads({ status: 'agendado' }),
    Api.me(),
  ]);

  expect(respostas[0].total).toBe(93);
  expect(respostas[2].usuario.email).toBe('consultor@ford.com');
  // dois refresh em paralelo fariam o segundo cair em TOKEN_REVOKED
  expect(salvar).toHaveBeenCalledTimes(1);
  expect(await Sessao.refresh()).not.toBe(r.refreshToken);
});

it('401 depois de logout no servidor: limpa a sessão e avisa o app', async () => {
  const r = await Api.login('consultor@ford.com', 'cons123');
  await Sessao.salvarTokens(r.accessToken, r.refreshToken);
  await Api.logout(r.refreshToken ?? null);

  const aviso = jest.fn();
  const parar = eventos.on(SESSAO_EXPIRADA, aviso);
  await expect(Api.listarLeads()).rejects.toMatchObject({ response: { status: 401 } });
  parar();

  expect(aviso).toHaveBeenCalledTimes(1);
  expect(await Sessao.access()).toBeNull();
});

it('401 no meio do uso: renova com o refresh e repete a requisição', async () => {
  const r = await Api.login('admin@ford.com', 'admin123');
  await Sessao.salvarTokens(r.accessToken, r.refreshToken);
  // logout sem refresh revoga só o access: o exp continua no futuro, então só o 401 denuncia
  await Api.logout(null);

  const lista = await Api.listarLeads({ prioridade: 'critica', perPage: 5 });
  expect(lista.items).toHaveLength(5);
  expect(await Sessao.access()).not.toBe(r.accessToken);
});
