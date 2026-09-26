const DIA = 86_400_000;

export function paraData(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // LocalDate do java chega como "2024-03-13"; sem hora o Date assume UTC e volta um dia no fuso BR
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dataCurta(iso: string | null | undefined): string {
  const d = paraData(iso);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function horaCurta(iso: string | Date | null | undefined): string {
  const d = iso instanceof Date ? iso : paraData(iso ?? null);
  if (!d) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function dataHora(iso: string | null | undefined): string {
  return `${dataCurta(iso)} às ${horaCurta(iso)}`;
}

export function haQuanto(iso: string | null | undefined): string {
  const d = paraData(iso);
  if (!d) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return dataCurta(iso);
}

export function dinheiro(valor: string | number | null | undefined): string {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? ''));
  if (!Number.isFinite(n)) return '—';
  // Intl no hermes do android nem sempre traz pt-BR completo; formato na mão
  const [int, dec] = n.toFixed(2).split('.');
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

export function porcento(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DIA);
}

export interface Revisao {
  numero: number;
  data: Date;
  dias: number; // negativo = atrasada
}

// plano ford: revisão a cada 12 meses (ou 10 mil km). sem odômetro no D0, a estimativa é por tempo.
export function proximaRevisao(dataCompra: string, hoje = new Date()): Revisao | null {
  const compra = paraData(dataCompra);
  if (!compra) return null;
  let n = 1;
  let alvo = new Date(compra);
  alvo.setFullYear(compra.getFullYear() + 1);
  // passou mais de 60 dias da revisão sem registro: considera a próxima do plano
  while (diasEntre(hoje, alvo) < -60 && n < 10) {
    n += 1;
    alvo = new Date(compra);
    alvo.setFullYear(compra.getFullYear() + n);
  }
  return { numero: n, data: alvo, dias: diasEntre(hoje, alvo) };
}

export function saudacao(agora = new Date()): string {
  const h = agora.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };

// o backend grava a observação passada pelo encoder OWASP (anti-XSS); na tela volta a ser texto
export function textoDoServidor(s: string | null | undefined): string {
  return (s ?? '').replace(/&(amp|lt|gt|quot|#39|#x27);/g, (m) => ENTIDADES[m] ?? m);
}
