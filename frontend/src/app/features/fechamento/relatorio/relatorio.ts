import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeft, FileText, LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { hoje, mesAnterior, mesDe } from '../../../core/datas';
import { CartaoPj, Categoria, Compra, GastoCartao, MeioAVista } from '../../../core/models';
import { somar } from '../../../core/regras/caixa';
import { baixarRelatorioContadora } from '../relatorio-contadora';

const MEIOS: Record<MeioAVista, string> = { PIX: 'Pix', DINHEIRO: 'Dinheiro', DEBITO: 'Débito' };

/** Uma seção da folha: um cartão PJ ou as compras à vista. */
interface Secao {
  chave: string;
  titulo: string;
  colunaExtra: 'Categoria' | 'Pagamento';
  linhas: { compra: Compra; extra: string }[];
  total: number;
}

// RN09: relatório de compras do mês pra contadora, separado por cartão PJ e à vista.
// Tela cheia, fora do layout com sidebar. "Baixar PDF" usa a impressão do navegador.
// Figma: https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=35-2002
@Component({
  selector: 'app-relatorio',
  imports: [RouterLink, CurrencyPipe, DatePipe, LucideAngularModule],
  templateUrl: './relatorio.html',
  styleUrl: './relatorio.scss',
})
export class Relatorio {
  private api = inject(ApiService);

  /** ?mes=2026-09, ligado pelo withComponentInputBinding(). */
  readonly mes = input<string>();

  protected readonly icones = { ArrowLeft, FileText };
  protected readonly usuario = inject(AuthService).usuario;
  protected readonly geradoEm = hoje();

  // Sem ?mes= (ou com um valor estranho), abre no mês anterior ao de hoje: o último fechado
  protected readonly mesDoRelatorio = computed(() => {
    const mes = this.mes();
    return mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesAnterior(mesDe(hoje()));
  });

  protected readonly compras = signal<Compra[]>([]);
  protected readonly cartoes = signal<CartaoPj[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly gastos = signal<GastoCartao[]>([]);
  protected readonly carregando = signal(true);
  protected readonly gerandoPlanilha = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly nomeDoMes = computed(() =>
    new Date(`${this.mesDoRelatorio()}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long' }),
  );
  protected readonly mesPorExtenso = computed(() => {
    const nome = this.nomeDoMes();
    return `${nome[0].toUpperCase()}${nome.slice(1)} de ${this.mesDoRelatorio().slice(0, 4)}`;
  });
  /** relatorio-compras-setembro-2026: nome da barra e do PDF salvo. */
  protected readonly nomeDoArquivo = computed(
    () => `relatorio-compras-${this.nomeDoMes()}-${this.mesDoRelatorio().slice(0, 4)}`,
  );

  // Resumo do topo da folha
  protected readonly gastosNoCartao = computed(() => this.gastos().filter((g) => g.formaPagamento === 'CARTAO'));
  protected readonly gastoAVista = computed(() => this.gastos().find((g) => g.formaPagamento === 'A_VISTA') ?? null);
  protected readonly totalNoCartao = computed(() => somar(this.gastosNoCartao().map((g) => g.total)));
  protected readonly totalDoMes = computed(() => somar(this.gastos().map((g) => g.total)));

  /** Uma seção por cartão usado no mês (na ordem do resumo) e, no fim, a das compras à vista. */
  protected readonly secoes = computed<Secao[]>(() => {
    const porData = [...this.compras()].sort((a, b) => a.data.localeCompare(b.data));
    const categoria = (id: number) => this.categorias().find((c) => c.id === id)?.nome ?? '—';
    const secoes: Secao[] = this.gastosNoCartao().map((g) => {
      const doCartao = porData.filter((c) => c.cartaoPjId === g.cartaoPjId);
      return {
        chave: `cartao-${g.cartaoPjId}`,
        titulo: `Cartão ${g.forma} · final ${g.finalCartao}`,
        colunaExtra: 'Categoria',
        linhas: doCartao.map((compra) => ({ compra, extra: categoria(compra.categoriaId) })),
        total: somar(doCartao.map((c) => c.valor)),
      };
    });
    const aVista = porData.filter((c) => c.formaPagamento === 'A_VISTA');
    if (aVista.length) {
      secoes.push({
        chave: 'a-vista',
        titulo: 'Compras à vista',
        colunaExtra: 'Pagamento',
        linhas: aVista.map((compra) => ({ compra, extra: compra.meioAVista ? MEIOS[compra.meioAVista] : '—' })),
        total: somar(aVista.map((c) => c.valor)),
      });
    }
    return secoes;
  });

  constructor() {
    // Carrega de novo se o ?mes= mudar com a tela aberta
    effect(() => {
      const mes = this.mesDoRelatorio();
      untracked(() => this.carregar(mes));
    });
  }

  private carregar(mes: string): void {
    this.carregando.set(true);
    this.erro.set(null);
    forkJoin({
      compras: this.api.compras(mes),
      cartoes: this.api.cartoes(),
      categorias: this.api.categorias('COMPRA'),
      gastos: this.api.gastosPorCartao(mes),
    }).subscribe({
      next: ({ compras, cartoes, categorias, gastos }) => {
        this.compras.set(compras);
        this.cartoes.set(cartoes);
        this.categorias.set(categorias);
        this.gastos.set(gastos);
        this.carregando.set(false);
      },
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  /** "Baixar PDF": a impressão do navegador, com o título da aba virando o nome sugerido do arquivo. */
  protected baixarPdf(): void {
    const titulo = document.title;
    document.title = this.nomeDoArquivo();
    window.print();
    document.title = titulo;
  }

  /** "Baixar planilha": o mesmo .xlsx formatado do botão "Planilha" do Fechamento do mês. */
  protected async baixarPlanilha(): Promise<void> {
    if (this.gerandoPlanilha()) return;
    this.gerandoPlanilha.set(true);
    try {
      await baixarRelatorioContadora({
        mes: this.mesDoRelatorio(),
        mesPorExtenso: this.mesPorExtenso(),
        negocio: this.usuario()?.nomeNegocio ?? "Evandro's Grill",
        totais: {
          cartaoPj: this.totalNoCartao(),
          aVista: this.gastoAVista()?.total ?? 0,
          compras: this.totalDoMes(),
        },
        gastos: this.gastos(),
        compras: this.compras(),
        cartoes: this.cartoes(),
        categorias: this.categorias(),
      });
    } catch {
      this.erro.set('Não deu pra gerar a planilha. Tente de novo.');
    }
    this.gerandoPlanilha.set(false);
  }
}
