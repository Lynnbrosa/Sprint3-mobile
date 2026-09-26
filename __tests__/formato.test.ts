import { perfilDoScore, prioridadeDoScore } from '@/constants/dominio';
import { dataCurta, dinheiro, proximaRevisao, textoDoServidor } from '@/lib/formato';
import { lerClaims } from '@/lib/jwt';
import { normalizarUrl } from '@/store/config';

describe('formato', () => {
  it('LocalDate do java não volta um dia no fuso de Brasília', () => {
    expect(dataCurta('2024-03-13')).toBe('13/03/2024');
  });

  it('dinheiro em pt-BR sem depender do Intl do hermes', () => {
    expect(dinheiro('144817.0')).toBe('R$ 144.817,00');
    expect(dinheiro(1234567.891)).toBe('R$ 1.234.567,89');
    expect(dinheiro('abc')).toBe('—');
  });

  it('revisão anual: conta a partir da compra e marca atraso', () => {
    const hoje = new Date('2026-09-26T12:00:00');
    expect(proximaRevisao('2026-01-10', hoje)).toMatchObject({ numero: 1, dias: 106 });
    const atrasada = proximaRevisao('2025-08-28', hoje)!;
    expect(atrasada.numero).toBe(1);
    expect(atrasada.dias).toBeLessThan(0);
  });

  it('observação que o backend passou pelo encoder OWASP volta a ser texto', () => {
    expect(textoDoServidor('Cliente &quot;VIP&quot; &amp; esposa &lt;3')).toBe('Cliente "VIP" & esposa <3');
  });
});

describe('regras de domínio', () => {
  it('cortes de prioridade iguais ao MlService.derivarPrioridade', () => {
    expect(prioridadeDoScore(0.85)).toBe('critica');
    expect(prioridadeDoScore(0.849)).toBe('alta');
    expect(prioridadeDoScore(0.65)).toBe('alta');
    expect(prioridadeDoScore(0.4)).toBe('media');
    expect(prioridadeDoScore(0.39)).toBe('baixa');
  });

  it('perfil pelo score só como plano B de backend antigo', () => {
    expect(perfilDoScore(0.9)).toBe('abandono');
    expect(perfilDoScore(0.6)).toBe('esquecido');
    expect(perfilDoScore(0.2)).toBe('fiel');
  });
});

describe('utilitários', () => {
  it('lê claims de um jwt sem validar assinatura', () => {
    const payload = btoa(JSON.stringify({ sub: 'u1', exp: 1790000000 })).replace(/=+$/, '');
    expect(lerClaims(`x.${payload}.y`)).toMatchObject({ sub: 'u1', exp: 1790000000 });
    expect(lerClaims('lixo')).toBeNull();
  });

  it('normaliza a URL da API digitada no celular', () => {
    expect(normalizarUrl(' 192.168.0.10:5000/ ')).toBe('http://192.168.0.10:5000');
    expect(normalizarUrl('https://api.previopls.com.br//')).toBe('https://api.previopls.com.br');
  });
});
