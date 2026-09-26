// emissor mínimo pra o cliente http avisar o store de auth sem import circular
type Ouvinte = (...args: unknown[]) => void;

const ouvintes = new Map<string, Set<Ouvinte>>();

export const SESSAO_EXPIRADA = 'sessao:expirada';

export const eventos = {
  on(nome: string, fn: Ouvinte): () => void {
    if (!ouvintes.has(nome)) ouvintes.set(nome, new Set());
    ouvintes.get(nome)!.add(fn);
    return () => ouvintes.get(nome)?.delete(fn);
  },
  emit(nome: string, ...args: unknown[]): void {
    ouvintes.get(nome)?.forEach((fn) => fn(...args));
  },
};
