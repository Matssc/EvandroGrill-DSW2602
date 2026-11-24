import { emReais, lerValor } from './dinheiro';

describe('dinheiro', () => {
  it('lê valores digitados do jeito brasileiro', () => {
    expect(lerValor('96')).toBe(96);
    expect(lerValor('96,50')).toBe(96.5);
    expect(lerValor('1.480,00')).toBe(1480);
    expect(lerValor('R$ 1.480')).toBe(1480);
    expect(lerValor('12.5')).toBe(12.5);
    expect(lerValor('')).toBeNaN();
  });

  it('mostra em reais', () => {
    // o Intl põe um espaço especial depois do R$
    expect(emReais(1480).replace(/\s/g, ' ')).toBe('R$ 1.480,00');
  });
});