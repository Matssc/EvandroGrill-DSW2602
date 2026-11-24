import { environment } from '../../environments/environment';

// Datas trafegam como texto: dia '2026-10-08', mês '2026-10'.

/** Hoje. No ng serve vale a dataFixa do environment, pra bater com os dados da API falsa. */
export function hoje(): string {
  if (environment.dataFixa) return environment.dataFixa;
  const agora = new Date();
  return [agora.getFullYear(), doisDigitos(agora.getMonth() + 1), doisDigitos(agora.getDate())].join('-');
}

/** '2026-10-08' vira '2026-10'. */
export function mesDe(data: string): string {
  return data.slice(0, 7);
}

/** '2026-10' vira '2026-09'. */
export function mesAnterior(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  return m === 1 ? `${ano - 1}-12` : `${ano}-${doisDigitos(m - 1)}`;
}

/** Hora atual no formato '21:15'. */
export function horaAgora(): string {
  const agora = new Date();
  return `${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}`;
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}