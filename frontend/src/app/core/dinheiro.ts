// Dinheiro digitado e mostrado no formato brasileiro.

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 1480 vira "R$ 1.480,00". No template, prefira o pipe: {{ valor | currency }}. */
export function emReais(valor: number): string {
  return reais.format(valor);
}

/** Lê o que a pessoa digitou: "96", "96,50", "1.480,00" ou "R$ 1.480" viram número. Vazio vira NaN. */
export function lerValor(texto: string): number {
  let numero = texto.replace(/[^\d,.]/g, '');
  if (numero.includes(',')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{3}$/.test(numero)) {
    numero = numero.replace(/\./g, ''); // "1.480" é mil quatrocentos e oitenta
  }
  return numero ? Number(numero) : NaN;
}