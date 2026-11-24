import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

/** fechado: caixa fechado · aberto: hoje, sem fechar · folga: dia que passou sem fechar */
export interface DiaDoMes {
  data: string;
  numero: string; // '01'
  estado: 'fechado' | 'aberto' | 'folga';
  vendido: number; // fechado: o total do fechamento; hoje: o que já foi lançado
}

const DIAS_COM_VALOR = 12; // com mais dias que isso, os valores saem de cima das barras (ficam no title)

// Gráfico "Vendas por dia" do Dashboard, feito só com HTML e CSS: cada coluna é um dia
// e a barra cresce em % da maior venda do mês.
@Component({
  selector: 'app-vendas-por-dia',
  imports: [CurrencyPipe],
  templateUrl: './vendas-por-dia.html',
  styleUrl: './vendas-por-dia.scss',
})
export class VendasPorDia {
  readonly dias = input.required<DiaDoMes[]>();
  readonly nomeDoMes = input.required<string>();

  protected readonly maiorVenda = computed(() => Math.max(1, ...this.dias().map((d) => d.vendido)));
  protected readonly mostrarValores = computed(() => this.dias().length <= DIAS_COM_VALOR);
}
