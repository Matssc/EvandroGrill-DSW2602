import { ItemVenda, MaisVendido, Venda } from '../models';
import { somar } from './caixa';

/** Junta os itens das vendas por produto. O que mais saiu (em quantidade) vem primeiro. */
export function maisVendidosDe(vendas: Venda[]): MaisVendido[] {
  const porProduto = new Map<number, MaisVendido>();
  for (const venda of vendas) {
    for (const item of venda.itens ?? []) {
      const atual = porProduto.get(item.produtoId) ?? {
        produtoId: item.produtoId,
        nome: item.produtoNome,
        quantidade: 0,
        total: 0,
      };
      atual.quantidade += item.quantidade;
      atual.total = somar([atual.total, item.subtotal]);
      porProduto.set(item.produtoId, atual);
    }
  }
  return [...porProduto.values()].sort(
    (a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

/** "4× Picanha, 2× Queijo Coalho" pra caber numa linha da tabela. */
export function resumoDosItens(itens: Pick<ItemVenda, 'produtoNome' | 'quantidade'>[]): string {
  return itens.map((i) => `${i.quantidade}× ${i.produtoNome}`).join(', ');
}
