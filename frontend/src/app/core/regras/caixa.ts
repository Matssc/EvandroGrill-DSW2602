// Regras do caixa (RN02 e RN03) num lugar só.
// A conta é feita em centavos pra não aparecer 331,4999999 na tela.

export interface RegrasCaixa {
    percentualRetirada: number; // RN02: 30 = 30% do total vendido no dia
    dividirRetirada: boolean; // RN03: a divisão é opcional
    percentualSalario: number; // RN03: 50 = metade da retirada vira salário
  }
  
  export interface CalculoFechamento {
    totalVendido: number;
    retirada: number;
    salario: number;
    reserva: number;
    ficaNoCaixa: number;
  }
  
  /** Soma valores em reais sem erro de arredondamento (0,1 + 0,2 = 0,3 mesmo). */
  export function somar(valores: number[]): number {
    return valores.reduce((total, v) => total + Math.round(v * 100), 0) / 100;
  }
  
  export function calcularFechamento(totalVendido: number, regras: RegrasCaixa): CalculoFechamento {
    const total = Math.round(totalVendido * 100);
    const retirada = Math.round((total * regras.percentualRetirada) / 100);
    const salario = regras.dividirRetirada
      ? Math.round((retirada * regras.percentualSalario) / 100)
      : retirada;
    const reserva = retirada - salario; // salário + reserva = retirada, sempre
  
    return {
      totalVendido: total / 100,
      retirada: retirada / 100,
      salario: salario / 100,
      reserva: reserva / 100,
      ficaNoCaixa: (total - retirada) / 100,
    };
  }