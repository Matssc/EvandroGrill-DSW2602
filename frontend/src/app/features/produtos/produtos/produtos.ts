import { CurrencyPipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Info, LucideAngularModule, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { ApiService, mensagemDeErro } from '../../../core/api/api.service';
import { emReais, lerValor } from '../../../core/dinheiro';
import { Categoria, NovoProduto, Produto } from '../../../core/models';
import { Espeto } from '../../../shared/espeto/espeto';

/** Prefixo do código pela categoria. O que não está aqui é espeto: ESP. */
const PREFIXOS: Record<string, string> = { Acompanhamentos: 'ACO', Bebidas: 'BEB' };

/** "Coração de Frango" e "coracao" batem na busca. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Cardápio da landing page: o que aparece no site, com preço, foto e o selo "Mais pedido".
// Figma: lista https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=36-1638
//        modal https://www.figma.com/design/XbZ4u2NpkYQzJHD0sJ4X10?node-id=36-2015
@Component({
  selector: 'app-produtos',
  imports: [ReactiveFormsModule, CurrencyPipe, LucideAngularModule, Espeto],
  templateUrl: './produtos.html',
  styleUrl: './produtos.scss',
})
export class Produtos {
  private api = inject(ApiService);
  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly icones = { Info, Pencil, Plus, Search, Trash2, Upload, X };

  // Estado da tela
  protected readonly produtos = signal<Produto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly filtro = signal<number | null>(null); // id da categoria; null = Todos
  protected readonly busca = signal('');
  /** Produtos com o "No site" sendo salvo: a chave fica travada até a API responder. */
  protected readonly salvandoNoSite = signal<number[]>([]);

  // Modal Novo produto / Editar produto
  protected readonly editando = signal<Produto | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroModal = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nome: ['', Validators.required],
    codigo: ['', Validators.required],
    categoriaId: [null as number | null, Validators.required],
    preco: ['', Validators.required],
    descricao: [''],
    fotoUrl: [''],
    mostrarNoSite: [true],
    destaque: [false],
  });

  /** Quantos aparecem no cardápio da landing page. */
  protected readonly qtdNoSite = computed(
    () => this.produtos().filter((p) => p.mostrarNoSite).length,
  );

  protected readonly lista = computed(() => {
    const filtro = this.filtro();
    const busca = normalizar(this.busca());
    return this.produtos().filter((p) => {
      if (filtro !== null && p.categoriaId !== filtro) return false;
      return !busca || normalizar(p.nome).includes(busca) || normalizar(p.codigo).includes(busca);
    });
  });

  constructor() {
    this.carregar();

    // Produto novo: enquanto a pessoa não mexer no código, ele acompanha a categoria escolhida
    this.form.controls.categoriaId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      if (!this.editando() && !this.form.controls.codigo.dirty) {
        this.form.controls.codigo.setValue(this.proximoCodigo(id));
      }
    });
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    forkJoin({
      produtos: this.api.produtos(),
      categorias: this.api.categorias('PRODUTO'),
    }).subscribe({
      next: ({ produtos, categorias }) => {
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

  protected nomeDaCategoria(id: number): string {
    return this.categorias().find((c) => c.id === id)?.nome ?? '—';
  }

  /** Chave "No site" da tabela: muda na hora e já salva. Se a API recusar, a chave volta. */
  protected trocarNoSite(produto: Produto): void {
    const { id, ...dados } = produto;
    const mostrarNoSite = !produto.mostrarNoSite;
    this.erro.set(null);
    this.atualizarNaLista({ ...produto, mostrarNoSite });
    this.salvandoNoSite.update((ids) => [...ids, id]);
    this.api.salvarProduto({ ...dados, mostrarNoSite }, id).subscribe({
      next: () => this.destravar(id),
      error: (e) => {
        this.atualizarNaLista(produto);
        this.destravar(id);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }

  protected excluir(produto: Produto): void {
    if (!confirm(`Excluir o produto "${produto.nome}"? Ele sai do cardápio da landing page.`)) return;
    this.api.excluirProduto(produto.id).subscribe({
      next: () => this.carregar(),
      error: (e) => this.erro.set(mensagemDeErro(e)),
    });
  }

  private atualizarNaLista(produto: Produto): void {
    this.produtos.update((lista) => lista.map((p) => (p.id === produto.id ? produto : p)));
  }

  private destravar(id: number): void {
    this.salvandoNoSite.update((ids) => ids.filter((x) => x !== id));
  }

  /** Próximo código da sequência da categoria: com ESP-001 a ESP-007 cadastrados, sugere ESP-008. */
  private proximoCodigo(categoriaId: number | null): string {
    const categoria = this.categorias().find((c) => c.id === categoriaId)?.nome ?? '';
    const prefixo = PREFIXOS[categoria] ?? 'ESP';
    const numeros = this.produtos()
      .filter((p) => p.codigo.startsWith(`${prefixo}-`))
      .map((p) => Number(p.codigo.slice(prefixo.length + 1)) || 0);
    const proximo = Math.max(0, ...numeros) + 1;
    return `${prefixo}-${String(proximo).padStart(3, '0')}`;
  }

  // ---- Modal

  protected novoProduto(): void {
    // filtrando uma categoria, o produto novo já entra nela
    const categoriaId = this.filtro() ?? this.categorias()[0]?.id ?? null;
    this.editando.set(null);
    this.form.reset({
      nome: '',
      codigo: this.proximoCodigo(categoriaId),
      categoriaId,
      preco: '',
      descricao: '',
      fotoUrl: '',
      mostrarNoSite: true,
      destaque: false,
    });
    this.abrirModal();
  }

  protected editar(produto: Produto): void {
    this.editando.set(produto);
    this.form.reset({
      nome: produto.nome,
      codigo: produto.codigo,
      categoriaId: produto.categoriaId,
      preco: emReais(produto.preco),
      descricao: produto.descricao ?? '',
      fotoUrl: produto.fotoUrl ?? '',
      mostrarNoSite: produto.mostrarNoSite,
      destaque: produto.destaque,
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
    const preco = lerValor(v.preco);
    if (!(preco > 0)) this.form.controls.preco.setErrors({ preco: true }); // o back recusa preço zero
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const produto: NovoProduto = {
      codigo: v.codigo.trim().toUpperCase(),
      nome: v.nome.trim(),
      descricao: v.descricao.trim() || null,
      preco,
      fotoUrl: v.fotoUrl.trim() || null,
      mostrarNoSite: v.mostrarNoSite,
      destaque: v.destaque,
      categoriaId: v.categoriaId!,
    };

    this.salvando.set(true);
    this.erroModal.set(null);
    this.api.salvarProduto(produto, this.editando()?.id).subscribe({
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

  private abrirModal(): void {
    this.erroModal.set(null);
    this.dialogo().nativeElement.showModal();
  }
}
