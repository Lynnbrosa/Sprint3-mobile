// só lê as claims pra saber quando o token vence. quem valida assinatura é o backend.
export interface ClaimsJwt {
  sub?: string;
  exp?: number;
  iat?: number;
  role?: string;
  typ?: string;
  [k: string]: unknown;
}

export function lerClaims(token: string | null | undefined): ClaimsJwt | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length < 2) return null;
  try {
    let b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(atob(b64)) as ClaimsJwt;
  } catch {
    return null;
  }
}

export function expiraEm(token: string | null | undefined): Date | null {
  const exp = lerClaims(token)?.exp;
  return typeof exp === 'number' ? new Date(exp * 1000) : null;
}
