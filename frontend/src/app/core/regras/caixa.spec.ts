import { calcularFechamento, somar } from './caixa';

describe('somar', () => {
  it('soma centavos sem erro de ponto flutuante', () => {
    expect(somar([0.1, 0.2])).toBe(0.3);
    expect(somar([96, 54, 182, 128, 240, 310, 66, 404])).toBe(1480);
    expect(somar([])).toBe(0);
  });
});

describe('calcularFechamento', () => {
  const regras = { percentualRetirada: 30, dividirRetirada: true, percentualSalario: 50 };

  it('segue o exemplo do levantamento: R$ 200 de retirada vira R$ 100 + R$ 100', () => {
    expect(calcularFechamento(666.67, regras)).toEqual({
      totalVendido: 666.67,
      retirada: 200,
      salario: 100,
      reserva: 100,
      ficaNoCaixa: 466.67,
    });
  });

  it('bate com o dia 03/10 do protótipo', () => {
    const r = calcularFechamento(2210, regras);
    expect(r.retirada).toBe(663);
    expect(r.salario).toBe(331.5);
    expect(r.reserva).toBe(331.5);
  });

  it('com a divisão desligada, toda a retirada vira salário', () => {
    const r = calcularFechamento(1000, { ...regras, dividirRetirada: false });
    expect(r.salario).toBe(300);
    expect(r.reserva).toBe(0);
  });

  it('salário + reserva sempre fecham com a retirada, mesmo com centavo ímpar', () => {
    const r = calcularFechamento(1000.03, regras);
    expect(r.retirada).toBe(300.01);
    expect(r.salario + r.reserva).toBeCloseTo(r.retirada, 2);
  });
});