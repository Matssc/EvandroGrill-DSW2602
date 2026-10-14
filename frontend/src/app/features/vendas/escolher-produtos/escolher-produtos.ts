import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Minus, Plus, X } from 'lucide-angular';
import { Categoria, ItemEscolhido, Produto } from '../../../core/models';
import { somar } from '../../../core/regras/caixa';

/** Preço de cada item: o guardado na venda (quando está editando) ou o do cadastro do produto. */
export function precoDoItem(produto: Produto, precosDaVenda: Record<number, number>): number {
  return precosDaVenda[produto.id] ?? produto.preco;
}

/** Soma dos itens escolhidos, do mesmo jeito que o back calcula o valor da venda. */
export function somaDosItens(
  itens: ItemEscolhido[],
  produtos: Produto[],
  precosDaVenda: Record<number, number> = {},
): number {
  return somar(
    itens.map((i) => {
      const produto = produtos.find((p) => p.id === i.produtoId);
      return produto ? i.quantidade * precoDoItem(produto, precosDaVenda) : 0;
    }),
  );
}

// Escolher os produtos da venda: toca no produto pra somar 1 e ajusta a quantidade na lista.
@Component({
  selector: 'app-escolher-produtos',
  imports: [CurrencyPipe, RouterLink, LucideAngularModule],
  templateUrl: './escolher-produtos.html',
  styleUrl: './escolher-produtos.scss',
})
export class EscolherProdutos {
  readonly produtos = input.required<Produto[]>();
  readonly categorias = input<Categoria[]>([]);
  readonly precosDaVenda = input<Record<number, number>>({});
  readonly itens = model.required<ItemEscolhido[]>();

  protected readonly icones = { Minus, Plus, X };
  protected readonly filtro = signal<number | null>(null);

  protected readonly categoriasComProduto = computed(() =>
    this.categorias().filter((c) => this.produtos().some((p) => p.categoriaId === c.id)),
  );
  protected readonly visiveis = computed(() => {
    const filtro = this.filtro();
    const lista =
      filtro === null ? this.produtos() : this.produtos().filter((p) => p.categoriaId === filtro);
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });
  protected readonly linhas = computed(() =>
    this.itens().flatMap((item) => {
      const produto = this.produtos().find((p) => p.id === item.produtoId);
      if (!produto) return [];
      const preco = precoDoItem(produto, this.precosDaVenda());
      return [{ ...item, nome: produto.nome, preco, subtotal: somar([item.quantidade * preco]) }];
    }),
  );
  protected readonly soma = computed(() =>
    somaDosItens(this.itens(), this.produtos(), this.precosDaVenda()),
  );

  protected quantidadeDe(produtoId: number): number {
    return this.itens().find((i) => i.produtoId === produtoId)?.quantidade ?? 0;
  }

  protected adicionar(produto: Produto): void {
    this.mudar(produto.id, 1);
  }

  protected mudar(produtoId: number, diferenca: number): void {
    const atual = this.quantidadeDe(produtoId);
    const nova = Math.min(9999, atual + diferenca);
    if (nova <= 0) {
      this.remover(produtoId);
    } else if (atual === 0) {
      this.itens.update((itens) => [...itens, { produtoId, quantidade: nova }]);
    } else {
      this.itens.update((itens) =>
        itens.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: nova } : i)),
      );
    }
  }

  protected remover(produtoId: number): void {
    this.itens.update((itens) => itens.filter((i) => i.produtoId !== produtoId));
  }
}
