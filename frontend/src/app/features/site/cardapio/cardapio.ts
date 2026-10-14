import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { linkPedido, linkWhatsApp } from '../../../core/contato';
import { ProdutoSite } from '../../../core/models';
import { Espeto } from '../../../shared/espeto/espeto';
import { IconeWhatsapp } from '../../../shared/icone-whatsapp/icone-whatsapp';

// Brasas em volta do espeto no card, nas posições do Figma: [x, y, raio] num quadro de 300x188
const BRASAS = [
  [169, 114, 2], [25, 170, 2.5], [235, 154, 1.5], [202, 116, 1.5], [16, 176, 1.5], [287, 120, 2], [85, 118, 2.5],
  [165, 130, 1.5], [106, 111, 2], [142, 124, 3], [196, 116, 3], [15, 136, 1], [99, 138, 3.5], [136, 138, 3],
];

// Cardápio da landing page (frame 15-1703): o que o Evandro deixou "No site" em Produtos do site.
@Component({
  selector: 'app-cardapio',
  imports: [CurrencyPipe, Espeto, IconeWhatsapp],
  templateUrl: './cardapio.html',
  styleUrl: './cardapio.scss',
})
export class Cardapio {
  private api = inject(ApiService);

  protected readonly brasas = BRASAS;
  protected readonly whatsapp = linkWhatsApp('Oi! Queria ver o cardápio completo.');

  protected readonly produtos = signal<ProdutoSite[]>([]);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly categoria = signal<string | null>(null); // null = Todos
  /** No celular aparecem 4 espetos, e o resto com o botão "Ver cardápio completo". */
  protected readonly verTudo = signal(false);

  /** Pílulas: só as categorias que têm produto no site, na ordem em que aparecem. */
  protected readonly categorias = computed(() => [...new Set(this.produtos().map((p) => p.categoria))]);

  protected readonly lista = computed(() => {
    const categoria = this.categoria();
    return categoria ? this.produtos().filter((p) => p.categoria === categoria) : this.produtos();
  });

  constructor() {
    this.api.produtosDoSite().subscribe({
      next: (produtos) => {
        this.produtos.set(produtos);
        this.carregando.set(false);
      },
      error: () => {
        this.falhou.set(true);
        this.carregando.set(false);
      },
    });
  }

  protected filtrar(categoria: string | null): void {
    this.categoria.set(categoria);
    this.verTudo.set(false);
  }

  protected pedir(produto: ProdutoSite): string {
    return linkPedido(produto.nome);
  }
}
