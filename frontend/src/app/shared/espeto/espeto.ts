import { Component, computed, input } from '@angular/core';

// Peças do espeto. A cor de cada uma é um token do Figma: --ilustracao-carne, --ilustracao-pimentao...
export type Peca =
  | 'carne'
  | 'linguica'
  | 'coracao'
  | 'frango'
  | 'bacon'
  | 'queijo'
  | 'cebola'
  | 'pimentao'
  | 'kafta'
  | 'pao';

// O que vai no espeto, pela palavra do nome do produto. Produto sem palavra conhecida vira carne.
const RECEITAS: [string, Peca[]][] = [
  ['alcatra', ['carne', 'pimentao', 'carne', 'cebola']],
  ['bacon', ['frango', 'bacon']],
  ['linguica', ['linguica']],
  ['coracao', ['coracao']],
  ['queijo', ['queijo']],
  ['kafta', ['kafta', 'kafta', 'cebola']],
  ['pao', ['pao']],
  ['frango', ['frango']],
];

// Medidas do componente Espeto do Figma (card do cardápio): peça de 38x32, 6px entre as peças
const PECA = { largura: 38, altura: 32, espaco: 6, raio: 10 };
const ANTES = 44.8; // palito livre antes da primeira peça
const DEPOIS = 21.2; // e depois da última
const ALTURA = 40;

/** "Linguiça Toscana" vira "linguica toscana", pra achar a receita. */
function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

// Desenho de um espeto em SVG: cardápio da landing page, lista de produtos e login.
// Quando o produto tiver foto (fotoUrl), quem usa mostra a foto no lugar do desenho.
@Component({
  selector: 'app-espeto',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg [attr.viewBox]="caixa().viewBox" xmlns="http://www.w3.org/2000/svg">
      <g [attr.transform]="caixa().transform">
        <rect class="palito" [attr.width]="comprimento()" y="17.5" height="5" rx="2.5" />
        @for (peca of pecasDoEspeto(); track $index) {
          <g [attr.transform]="'translate(' + (antes + $index * passo) + ' 4)'">
            <rect [attr.width]="peca.largura" [attr.height]="peca.altura" [attr.rx]="peca.raio" [style.fill]="peca.cor" />
            <rect class="marca" x="11" width="3" [attr.height]="peca.altura" />
            <rect class="marca" x="23" width="3" [attr.height]="peca.altura" />
          </g>
        }
      </g>
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { display: block; width: 100%; height: auto; overflow: visible; }
    .palito { fill: var(--madeira); }
    .marca { fill: var(--ilustracao-tostado); opacity: 0.45; }
  `,
})
export class Espeto {
  /** Nome do produto: decide as peças (ex.: alcatra leva pimentão e cebola). */
  readonly produto = input('');
  /** Peças na mão, quando não é um produto (ex.: os espetos da churrasqueira). */
  readonly pecas = input<Peca[]>([]);
  readonly quantidade = input(4);
  /** Ângulo em graus. Negativo sobe pra direita, como no Figma (-16). */
  readonly inclinacao = input(-16);

  protected readonly antes = ANTES;
  protected readonly passo = PECA.largura + PECA.espaco;

  protected readonly comprimento = computed(
    () => ANTES + this.quantidade() * this.passo - PECA.espaco + DEPOIS,
  );

  protected readonly pecasDoEspeto = computed(() => {
    const nome = semAcento(this.produto());
    const receita = this.pecas().length
      ? this.pecas()
      : (RECEITAS.find(([palavra]) => nome.includes(palavra))?.[1] ?? ['carne']);
    return Array.from({ length: this.quantidade() }, (_, i) => ({
      ...PECA,
      cor: `var(--ilustracao-${receita[i % receita.length]})`,
    }));
  });

  /** Tamanho do desenho já girado, pra o SVG não cortar as pontas. */
  protected readonly caixa = computed(() => {
    const angulo = (Math.abs(this.inclinacao()) * Math.PI) / 180;
    const c = this.comprimento();
    const largura = c * Math.cos(angulo) + ALTURA * Math.sin(angulo);
    const altura = c * Math.sin(angulo) + ALTURA * Math.cos(angulo);
    const x = (largura - c) / 2;
    const y = (altura - ALTURA) / 2;
    return {
      viewBox: `0 0 ${largura.toFixed(1)} ${altura.toFixed(1)}`,
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${this.inclinacao()} ${c / 2} ${ALTURA / 2})`,
    };
  });
}
