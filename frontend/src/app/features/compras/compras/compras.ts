import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Banknote,
  CreditCard,
  Info,
  LucideAngularModule,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { hoje, mesDe } from '../../../core/datas';
import { emReais, lerValor } from '../../../core/dinheiro';
import {
  CartaoPj,
  Categoria,
  Compra,
  FormaPagamentoCompra,
  GastoCartao,
  MeioAVista,
  NovaCompra,
} from '../../../core/models';
import { somar } from '../../../core/regras/caixa';

const MEIOS: { valor: MeioAVista; texto: string }[] = [
  { valor: 'PIX', texto: 'Pix' },
  { valor: 'DINHEIRO', texto: 'Dinheiro' },
  { valor: 'DEBITO', texto: 'Débito' },
];
const CORES_CATEGORIA = 4; // brasa, âmbar, carvão e cinza, nessa ordem

/** Filtro da tabela: todas, um cartão (pelo id) ou só as à vista. */
type Filtro = 'TODAS' | 'A_VISTA' | number;

/** "Carnes – Açougue" e "carnes - acougue" batem na busca. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** ['Pix', 'dinheiro', 'débito'] vira "Pix, dinheiro e débito". */
function emLista(itens: string[]): string {
  return itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? '');
}

/** Nome do meio no meio da frase: "Pix", "dinheiro", "débito". */
function meioMinusculo(meio: MeioAVista | null): string {
  const texto = MEIOS.find((m) => m.valor === meio)?.texto ?? '';
  return meio === 'PIX' ? texto : texto.toLowerCase();
}

// RN06 (compras do mês por categoria) e RN07 (cartão PJ ou à vista).
// Figma: lista https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=34-1752
//        modal https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=34-2182
@Component({
  selector: 'app-compras',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe, LucideAngularModule],
  templateUrl: './compras.html',
  styleUrl: './compras.scss',
})
export class Compras {
  private api = inject(ApiService);
  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly meios = MEIOS;
  protected readonly icones = { Banknote, CreditCard, Info, Pencil, Plus, Search, ShoppingCart, Trash2, X };
  protected readonly hoje = hoje();
  protected readonly mesAtual = mesDe(this.hoje);

  // Estado da tela
  protected readonly mes = signal(this.mesAtual);
  protected readonly compras = signal<Compra[]>([]);
  protected readonly gastos = signal<GastoCartao[]>([]);
  protected readonly cartoes = signal<CartaoPj[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly escolhendoMes = signal(false);
  protected readonly filtro = signal<Filtro>('TODAS');
  protected readonly busca = signal('');

  // Modal Nova compra / Editar compra
  protected readonly editando = signal<Compra | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroModal = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    descricao: ['', Validators.required],
    data: ['', Validators.required],
    valor: ['', Validators.required],
    categoriaId: [null as number | null, Validators.required],
    formaPagamento: ['CARTAO' as FormaPagamentoCompra],
    cartaoPjId: [null as number | null],
    meioAVista: ['PIX' as MeioAVista],
  });

  // Nome do mês: "outubro" no meio da frase, "Outubro de 2026" no botão
  protected readonly nomeDoMes = computed(() =>
    new Date(`${this.mes()}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long' }),
  );
  protected readonly mesPorExtenso = computed(() => {
    const nome = this.nomeDoMes();
    return `${nome[0].toUpperCase()}${nome.slice(1)} de ${this.mes().slice(0, 4)}`;
  });

  protected readonly totalDoMes = computed(() => somar(this.compras().map((c) => c.valor)));

  /** Cards do topo: uma linha por cartão usado no mês e uma pra "À vista". */
  protected readonly indicadores = computed(() => {
    const total = this.totalDoMes();
    return this.gastos().map((g) => {
      const noCartao = g.formaPagamento === 'CARTAO';
      return {
        chave: g.cartaoPjId ?? 'A_VISTA',
        titulo: noCartao ? `Cartão ${g.forma} · ${g.finalCartao}` : this.tituloAVista(),
        icone: noCartao ? CreditCard : Banknote,
        total: g.total,
        percentual: total ? Math.round((g.total / total) * 100) : 0,
        quantidade: g.qtdCompras,
      };
    });
  });

  /** Pílulas: Todas, os cartões ativos (ou usados no mês) e À vista. */
  protected readonly filtros = computed(() => {
    const usados = new Set(this.compras().map((c) => c.cartaoPjId));
    const cartoes = this.cartoes().filter((k) => k.ativo || usados.has(k.id));
    return [
      { valor: 'TODAS' as Filtro, texto: 'Todas' },
      ...cartoes.map((k) => ({ valor: k.id as Filtro, texto: k.apelido })),
      { valor: 'A_VISTA' as Filtro, texto: 'À vista' },
    ];
  });

  protected readonly lista = computed(() => {
    const filtro = this.filtro();
    const busca = normalizar(this.busca());
    return this.compras().filter((c) => {
      if (filtro === 'A_VISTA' && c.formaPagamento !== 'A_VISTA') return false;
      if (typeof filtro === 'number' && c.cartaoPjId !== filtro) return false;
      return !busca || normalizar(c.descricao).includes(busca);
    });
  });
  protected readonly totalDaLista = computed(() => somar(this.lista().map((c) => c.valor)));
  protected readonly totalNoCartao = computed(() =>
    somar(this.lista().filter((c) => c.formaPagamento === 'CARTAO').map((c) => c.valor)),
  );

  /** Bloco "Por categoria": do maior gasto pro menor, sobre o mês inteiro. */
  protected readonly porCategoria = computed(() => {
    const total = this.totalDoMes();
    const ids = [...new Set(this.compras().map((c) => c.categoriaId))];
    return ids
      .map((id) => {
        const valor = somar(this.compras().filter((c) => c.categoriaId === id).map((c) => c.valor));
        return { id, nome: this.nomeDaCategoria(id), total: valor, percentual: total ? (valor / total) * 100 : 0 };
      })
      .sort((a, b) => b.total - a.total)
      .map((c, i) => ({ ...c, cor: i % CORES_CATEGORIA }));
  });

  /** Cartões que dá pra escolher no modal: os ativos, mais o da compra em edição se ele foi desativado. */
  protected readonly cartoesDoModal = computed(() => {
    const atual = this.editando()?.cartaoPjId;
    return this.cartoes().filter((k) => k.ativo || k.id === atual);
  });

  constructor() {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    forkJoin({
      compras: this.api.compras(this.mes()),
      gastos: this.api.gastosPorCartao(this.mes()),
      cartoes: this.api.cartoes(),
      categorias: this.api.categorias('COMPRA'),
    }).subscribe({
      next: ({ compras, gastos, cartoes, categorias }) => {
        this.compras.set(compras);
        this.gastos.set(gastos);
        this.cartoes.set(cartoes);
        this.categorias.set(categorias);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected trocarMes(mes: string): void {
    if (!mes || mes > this.mesAtual) return;
    this.mes.set(mes);
    this.escolhendoMes.set(false);
    this.filtro.set('TODAS');
    this.erro.set(null);
    this.carregar();
  }

  protected nomeDaCategoria(id: number): string {
    return this.categorias().find((c) => c.id === id)?.nome ?? '—';
  }

  protected cartao(id: number | null): CartaoPj | undefined {
    return this.cartoes().find((k) => k.id === id);
  }

  protected meioNaFrase(meio: MeioAVista | null): string {
    return meioMinusculo(meio);
  }

  /** "À vista (Pix e dinheiro)", com os meios que aparecem no mês. */
  private tituloAVista(): string {
    const usados = MEIOS.filter((m) => this.compras().some((c) => c.meioAVista === m.valor));
    const meios = emLista(usados.map((m) => meioMinusculo(m.valor)));
    return meios ? `À vista (${meios})` : 'À vista';
  }

  // ---- Modal

  protected novaCompra(): void {
    const primeiroCartao = this.cartoesDoModal()[0]?.id ?? null;
    this.editando.set(null);
    this.form.reset({
      descricao: '',
      data: this.mes() === this.mesAtual ? this.hoje : `${this.mes()}-01`,
      valor: '',
      categoriaId: this.categorias()[0]?.id ?? null,
      formaPagamento: primeiroCartao ? 'CARTAO' : 'A_VISTA',
      cartaoPjId: primeiroCartao,
      meioAVista: 'PIX',
    });
    this.abrirModal();
  }

  protected editar(compra: Compra): void {
    this.editando.set(compra);
    this.form.reset({
      descricao: compra.descricao,
      data: compra.data,
      valor: emReais(compra.valor),
      categoriaId: compra.categoriaId,
      formaPagamento: compra.formaPagamento,
      cartaoPjId: compra.cartaoPjId ?? this.cartoesDoModal()[0]?.id ?? null,
      meioAVista: compra.meioAVista ?? 'PIX',
    });
    this.abrirModal();
  }

  protected fecharModal(): void {
    this.dialogo().nativeElement.close();
  }

  /** Esc, botão fechar ou Cancelar: tudo passa pelo evento close do dialog. */
  protected aoFecharModal(): void {
    this.editando.set(null);
    this.erroModal.set(null);
  }

  protected salvar(): void {
    const v = this.form.getRawValue();
    const valor = lerValor(v.valor);
    if (!(valor > 0)) this.form.controls.valor.setErrors({ valor: true });
    const noCartao = v.formaPagamento === 'CARTAO';
    if (noCartao && !v.cartaoPjId) this.form.controls.cartaoPjId.setErrors({ required: true });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // RN07: compra no cartão não tem meio à vista, e compra à vista não tem cartão
    const compra: NovaCompra = {
      data: v.data,
      descricao: v.descricao.trim(),
      valor,
      formaPagamento: v.formaPagamento,
      meioAVista: noCartao ? null : v.meioAVista,
      cartaoPjId: noCartao ? v.cartaoPjId : null,
      categoriaId: v.categoriaId!,
    };

    this.salvando.set(true);
    this.erroModal.set(null);
    this.api.salvarCompra(compra, this.editando()?.id).subscribe({
      next: () => {
        this.salvando.set(false);
        this.fecharModal();
        this.carregar();
      },
      error: (e) => {
        this.salvando.set(false);
        this.erroModal.set(mensagemDeErro(e));
      },
    });
  }

  protected excluir(compra: Compra): void {
    if (!confirm(`Excluir a compra "${compra.descricao}" de ${emReais(compra.valor)}?`)) return;
    this.api.excluirCompra(compra.id).subscribe({
      next: () => this.carregar(),
      error: (e) => this.erro.set(mensagemDeErro(e)),
    });
  }

  private abrirModal(): void {
    this.erroModal.set(null);
    this.dialogo().nativeElement.showModal();
  }
}
