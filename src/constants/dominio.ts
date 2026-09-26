import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Papel, PerfilCliente, PrioridadeLead, StatusLead } from '@/types/api';
import type { Tema } from '@/theme/tokens';

export type NomeIcone = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const PRIORIDADES: PrioridadeLead[] = ['critica', 'alta', 'media', 'baixa'];
export const STATUS: StatusLead[] = ['aberto', 'agendado', 'recusado', 'sem-contato'];

export const PRIORIDADE_LABEL: Record<PrioridadeLead, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export function corPrioridade(p: PrioridadeLead, t: Tema): string {
  return { critica: t.perigo, alta: t.alerta, media: t.atencao, baixa: t.neutro }[p];
}

// ícones de luz-espia do painel: cada prioridade tem a sua
export const PRIORIDADE_ICONE: Record<PrioridadeLead, NomeIcone> = {
  critica: 'car-brake-alert',
  alta: 'engine-outline',
  media: 'car-wrench',
  baixa: 'car-info',
};

export const PERFIL_LABEL: Record<PerfilCliente, string> = {
  abandono: 'Abandono',
  esquecido: 'Esquecido',
  economico: 'Econômico',
  fiel: 'Fiel',
};

export const PERFIL_DESCRICAO: Record<PerfilCliente, string> = {
  abandono: 'Tende a trocar a rede oficial por oficina paralela antes da 1ª revisão.',
  esquecido: 'Gosta da marca, mas perde o prazo das revisões sem um lembrete.',
  economico: 'Decide pelo preço. Responde a parcelamento e custo total.',
  fiel: 'Volta para a concessionária sem precisar de abordagem.',
};

export const PERFIL_ICONE: Record<PerfilCliente, NomeIcone> = {
  abandono: 'exit-run',
  esquecido: 'calendar-alert',
  economico: 'cash-multiple',
  fiel: 'shield-check-outline',
};

export function corPerfil(p: PerfilCliente, t: Tema): string {
  return { abandono: t.perigo, esquecido: t.alerta, economico: t.atencao, fiel: t.sucesso }[p];
}

export const STATUS_LABEL: Record<StatusLead, string> = {
  aberto: 'Aberto',
  agendado: 'Agendado',
  recusado: 'Recusado',
  'sem-contato': 'Sem contato',
};

export const STATUS_ICONE: Record<StatusLead, NomeIcone> = {
  aberto: 'progress-clock',
  agendado: 'calendar-check',
  recusado: 'close-circle-outline',
  'sem-contato': 'phone-off-outline',
};

export function corStatus(s: StatusLead, t: Tema): string {
  return { aberto: t.destaque, agendado: t.sucesso, recusado: t.perigo, 'sem-contato': t.neutro }[s];
}

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: 'Administrador',
  consultor: 'Consultor de serviços',
  analista: 'Analista (somente leitura)',
};

export function podeRegistrarResultado(papel: Papel | null | undefined): boolean {
  return papel === 'consultor' || papel === 'admin';
}

export function podeCadastrarVenda(papel: Papel | null | undefined): boolean {
  return papel === 'admin';
}

// mesmos cortes do MlService.derivarPrioridade no backend
export function prioridadeDoScore(score: number): PrioridadeLead {
  if (score >= 0.85) return 'critica';
  if (score >= 0.65) return 'alta';
  if (score >= 0.4) return 'media';
  return 'baixa';
}

// backend antigo não manda perfil na lista; cortes dos buckets do classificador local
export function perfilDoScore(score: number): PerfilCliente {
  if (score >= 0.78) return 'abandono';
  if (score >= 0.55) return 'esquecido';
  if (score >= 0.3) return 'economico';
  return 'fiel';
}

export const REGIOES = ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS', 'BA', 'PE', 'CE', 'GO', 'DF'];

export const MODELOS_FORD = ['Ranger', 'Maverick', 'Territory', 'Bronco Sport', 'F-150', 'Mustang', 'Transit'];
