import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { linkComoChegar } from '../../../core/contato';
import { ProdutoSite } from '../../../core/models';
import { Brasas } from '../../../shared/brasas/brasas';
import { Espeto } from '../../../shared/espeto/espeto';
import { Revelar } from '../../../shared/revelar/revelar';

// Primeira dobra: título, botões e o card "Os mais pedidos" com 3 produtos do cardápio.
@Component({
  selector: 'app-hero',
  imports: [CurrencyPipe, Espeto, Revelar, Brasas],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  private api = inject(ApiService);
  protected readonly comoChegar = linkComoChegar();
  private readonly produtos = signal<ProdutoSite[]>([]);

  // 3 produtos: primeiro os marcados como "Destaque" em Produtos do site;
  // se houver menos de 3 destaques, completa com os outros produtos do cardápio.
  protected readonly maisPedidos = computed(() => {
    const lista = this.produtos();
    const destaques = lista.filter((p) => p.destaque);
    const outros = lista.filter((p) => !p.destaque);
    return [...destaques, ...outros].slice(0, 3);
  });

  constructor() {
    // Mesmo endpoint público do cardápio. Se falhar, o card simplesmente não aparece.
    this.api.produtosDoSite().subscribe({
      next: (produtos) => this.produtos.set(produtos),
      error: () => this.produtos.set([]),
    });
  }
}
