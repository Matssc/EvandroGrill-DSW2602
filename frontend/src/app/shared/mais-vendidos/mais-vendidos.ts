import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MaisVendido } from '../../core/models';

// Ranking dos produtos que mais saíram, com a barra proporcional à quantidade.
// Usado em Vendas do dia (o dia) e no Dashboard (o mês).
@Component({
  selector: 'app-mais-vendidos',
  imports: [CurrencyPipe],
  template: `
    @if (!lista().length) {
      <p class="vazio">{{ vazio() }}</p>
    } @else {
      <ol>
        @for (p of lista(); track p.produtoId; let i = $index) {
          <li>
            <span class="posicao" [class.primeiro]="i === 0">{{ i + 1 }}</span>
            <div class="corpo">
              <p class="linha">
                <strong>{{ p.nome }}</strong>
                <span>{{ p.total | currency }}</span>
              </p>
              <span class="trilho" aria-hidden="true"
                ><span [style.width.%]="(p.quantidade / maior()) * 100"></span
              ></span>
              <small>{{ p.quantidade }} {{ p.quantidade === 1 ? 'unidade' : 'unidades' }}</small>
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    ol {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .posicao {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--n-100);
      color: var(--n-600);
      font-size: 13px;
      font-weight: 600;
    }
    .posicao.primeiro {
      background: var(--brasa-clara);
      color: var(--brasa);
    }
    .corpo {
      flex: 1;
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
    }
    .linha {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .linha strong {
      min-width: 0;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .linha span {
      font-weight: 600;
      white-space: nowrap;
    }
    .trilho {
      display: block;
      height: 6px;
      border-radius: 3px;
      background: var(--n-100);
      overflow: hidden;
    }
    .trilho span {
      display: block;
      height: 100%;
      border-radius: 3px;
      background: var(--brasa);
    }
    small {
      font-size: 12px;
      color: var(--n-500);
    }
    .vazio {
      padding: 16px 0;
      text-align: center;
      color: var(--n-500);
    }
  `,
})
export class MaisVendidos {
  readonly itens = input.required<MaisVendido[]>();
  /** Quantos aparecem (null = todos). */
  readonly limite = input<number | null>(5);
  readonly vazio = input('Nenhum produto lançado ainda.');

  protected readonly lista = computed(() => {
    const limite = this.limite();
    return limite ? this.itens().slice(0, limite) : this.itens();
  });
  protected readonly maior = computed(() => Math.max(1, ...this.itens().map((p) => p.quantidade)));
}
