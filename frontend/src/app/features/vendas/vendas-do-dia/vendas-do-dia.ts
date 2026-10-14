import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Banknote,
  CalendarCheck,
  CreditCard,
  Diamond,
  LucideAngularModule,
  LucideIconData,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { hoje, horaAgora, mesDe } from '../../../core/datas';
import { emReais, lerValor } from '../../../core/dinheiro';
import {
  Categoria,
  Configuracao,
  FechamentoDiario,
  FormaPagamentoVenda,
  ItemEscolhido,
  NovaVenda,
  Produto,
  Venda,
} from '../../../core/models';
import { calcularFechamento, somar } from '../../../core/regras/caixa';
import { maisVendidosDe, resumoDosItens } from '../../../core/regras/vendas';
import { MaisVendidos } from '../../../shared/mais-vendidos/mais-vendidos';
import { EscolherProdutos, somaDosItens } from '../escolher-produtos/escolher-produtos';

interface Forma {
  valor: FormaPagamentoVenda;
  texto: string;
  icone: LucideIconData;
}

const FORMAS: Forma[] = [
  { valor: 'PIX', texto: 'Pix', icone: Diamond },
  { valor: 'DINHEIRO', texto: 'Dinheiro', icone: Banknote },
  { valor: 'DEBITO', texto: 'Débito', icone: CreditCard },
  { valor: 'CREDITO', texto: 'Crédito', icone: CreditCard },
];
const ORDEM_DO_RESUMO: FormaPagamentoVenda[] = ['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO'];
const ORIGENS = ['Balcão', 'WhatsApp', ...Array.from({ length: 12 }, (_, i) => `Mesa ${i + 1}`)];

/** O que o card "Fechar o dia" mostra. */
interface ResumoDoDia {
  retirada: number;
  salario: number;
  reserva: number;
  ficaNoCaixa: number;
  percentualRetirada: number;
  percentualSalario: number;
}

// Tela modelo: RN01 (lançar vendas) + RN02, RN03 e RN05 (fechar o dia).
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=33-2022
@Component({
  selector: 'app-vendas-do-dia',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, LucideAngularModule, EscolherProdutos, MaisVendidos],
  templateUrl: './vendas-do-dia.html',
  styleUrl: './vendas-do-dia.scss',
})
export class VendasDoDia {
  private api = inject(ApiService);

  protected readonly formas = FORMAS;
  protected readonly origens = ORIGENS;
  protected readonly icones = { CalendarCheck, Pencil, Plus, Trash2 };
  protected readonly hoje = hoje();
  protected readonly resumoDosItens = resumoDosItens;

  // Estado da tela
  protected readonly data = signal(this.hoje);
  protected readonly vendas = signal<Venda[]>([]);
  protected readonly config = signal<Configuracao | null>(null);
  protected readonly fechamentosDoMes = signal<FechamentoDiario[]>([]);
  protected readonly produtos = signal<Produto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly itens = signal<ItemEscolhido[]>([]); // produtos da venda que está sendo lançada
  protected readonly faltaProduto = signal(false);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly modo = signal<NovaVenda['tipoLancamento']>('POR_VENDA');
  protected readonly editando = signal<Venda | null>(null);
  protected readonly escolhendoDia = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    valor: [''], // só no "Total do dia"; no "Por venda" o valor é a soma dos produtos
    origem: ['Balcão'],
    forma: ['PIX' as FormaPagamentoVenda],
  });

  // Contas da tela: recalculam sozinhas quando as vendas ou a configuração mudam
  protected readonly fechamento = computed(
    () => this.fechamentosDoMes().find((f) => f.data === this.data()) ?? null,
  );
  protected readonly lista = computed(() =>
    [...this.vendas()].sort((a, b) => (b.hora ?? '').localeCompare(a.hora ?? '')),
  );
  protected readonly total = computed(() => somar(this.vendas().map((v) => v.valor)));
  /** Na edição, os produtos que já estavam na venda mantêm o preço da época (igual ao back). */
  protected readonly precosDaVenda = computed<Record<number, number>>(() =>
    Object.fromEntries((this.editando()?.itens ?? []).map((i) => [i.produtoId, i.precoUnitario])),
  );
  protected readonly somaItens = computed(() => somaDosItens(this.itens(), this.produtos(), this.precosDaVenda()));
  protected readonly maisVendidosDoDia = computed(() => maisVendidosDe(this.vendas()));
  protected readonly avulsas = computed(() => this.vendas().filter((v) => v.tipoLancamento === 'POR_VENDA'));
  protected readonly ticketMedio = computed(() => {
    const quantidade = this.avulsas().length;
    return quantidade ? somar(this.avulsas().map((v) => v.valor)) / quantidade : 0;
  });
  protected readonly porPagamento = computed(() =>
    ORDEM_DO_RESUMO.map((valor) => {
      const vendas = this.avulsas().filter((v) => v.formaPagamento === valor);
      return { ...this.forma(valor)!, quantidade: vendas.length, total: somar(vendas.map((v) => v.valor)) };
    }),
  );
  protected readonly numeroDoDia = computed(
    () => this.fechamentosDoMes().filter((f) => f.data < this.data()).length + 1,
  );

  /** Dia aberto: prévia com a configuração atual. Dia fechado: o que ficou gravado no fechamento. */
  protected readonly resumo = computed<ResumoDoDia | null>(() => {
    const fechado = this.fechamento();
    if (fechado) {
      return {
        retirada: fechado.valorRetirada,
        salario: fechado.valorSalario,
        reserva: fechado.valorReserva,
        ficaNoCaixa: somar([fechado.totalVendido, -fechado.valorRetirada]),
        percentualRetirada: fechado.percentualRetirada,
        percentualSalario: fechado.percentualSalario,
      };
    }
    const config = this.config();
    if (!config) return null;
    return {
      ...calcularFechamento(this.total(), config),
      percentualRetirada: config.percentualRetirada,
      percentualSalario: config.dividirRetirada ? config.percentualSalario : 100,
    };
  });

  constructor() {
    this.carregar();
  }

  protected forma(valor: FormaPagamentoVenda | null): Forma | undefined {
    return FORMAS.find((f) => f.valor === valor);
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({
      vendas: this.api.vendas(this.data()),
      config: this.api.configuracao(),
      fechamentos: this.api.fechamentos(mesDe(this.data())),
      produtos: this.api.produtos(),
      categorias: this.api.categorias('PRODUTO'),
    }).subscribe({
      next: ({ vendas, config, fechamentos, produtos, categorias }) => {
        this.vendas.set(vendas);
        this.config.set(config);
        this.fechamentosDoMes.set(fechamentos);
        this.produtos.set(produtos);
        this.categorias.set(categorias);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected trocarDia(data: string): void {
    if (!data || data > this.hoje) return;
    this.data.set(data);
    this.escolhendoDia.set(false);
    this.cancelarEdicao();
    this.modo.set(data === this.hoje ? 'POR_VENDA' : 'TOTAL_DIA');
    this.erro.set(null);
    this.carregar();
  }

  protected salvar(): void {
    const porVenda = this.modo() === 'POR_VENDA';
    const itens = this.itens();
    const digitado = lerValor(this.form.controls.valor.value);
    // "Por venda" precisa de produto; "Total do dia" precisa do total (os produtos são opcionais)
    if (porVenda && !itens.length) {
      this.faltaProduto.set(true);
      return;
    }
    if (!porVenda && !(digitado > 0)) {
      this.form.controls.valor.setErrors({ valor: true });
      this.form.controls.valor.markAsTouched();
      return;
    }
    const { origem, forma } = this.form.getRawValue();
    const editando = this.editando();
    const venda: NovaVenda = {
      data: this.data(),
      hora: porVenda ? (editando?.hora ?? horaAgora()) : null,
      tipoLancamento: this.modo(),
      origem: porVenda ? origem : null,
      formaPagamento: porVenda ? forma : null,
      valor: porVenda ? this.somaItens() : digitado,
      itens,
    };

    this.salvando.set(true);
    this.erro.set(null);
    const pedido = editando ? this.api.editarVenda(editando.id, venda) : this.api.lancarVenda(venda);
    pedido.subscribe({
      next: () => {
        this.salvando.set(false);
        if (editando) {
          this.cancelarEdicao();
        } else {
          this.form.controls.valor.reset(); // mantém origem e forma pra próxima venda
          this.itens.set([]);
          this.faltaProduto.set(false);
        }
        this.carregar();
      },
      error: (e) => {
        this.salvando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }

  protected editar(venda: Venda): void {
    this.editando.set(venda);
    this.modo.set(venda.tipoLancamento);
    this.itens.set(venda.itens.map(({ produtoId, quantidade }) => ({ produtoId, quantidade })));
    this.faltaProduto.set(false);
    this.form.setValue({
      valor: emReais(venda.valor),
      origem: venda.origem ?? 'Balcão',
      forma: venda.formaPagamento ?? 'PIX',
    });
  }

  protected cancelarEdicao(): void {
    this.editando.set(null);
    this.itens.set([]);
    this.faltaProduto.set(false);
    this.form.reset();
  }

  protected excluir(venda: Venda): void {
    if (!confirm(`Excluir a venda de ${emReais(venda.valor)}?`)) return;
    this.api.excluirVenda(venda.id).subscribe({
      next: () => this.carregar(),
      error: (e) => this.erro.set(mensagemDeErro(e)),
    });
  }

  protected fecharDia(): void {
    const pergunta = `Fechar o dia com ${emReais(this.total())} vendidos? Depois disso as vendas dele não mudam mais.`;
    if (!confirm(pergunta)) return;
    this.salvando.set(true);
    this.api.fecharDia(this.data()).subscribe({
      next: () => {
        this.salvando.set(false);
        this.carregar();
      },
      error: (e) => {
        this.salvando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }
}