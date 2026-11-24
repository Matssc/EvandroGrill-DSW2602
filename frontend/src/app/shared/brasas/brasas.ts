import { Component, input } from '@angular/core';

// Cada brasa: posição na horizontal (%), tamanho (px), duração e atraso (s), deriva de lado (px) e cor.
// Os valores são fixos (nada de Math.random) pra a animação ser igual a cada visita.
const CORES = ['#f2a33a', '#ff7a3d', '#efebe4'];
const BRASAS = Array.from({ length: 48 }, (_, i) => ({
  esq: (i * 37 + 11) % 100,
  tam: 4 + ((i * 5) % 9),
  dur: 7 + ((i * 3) % 7),
  atraso: -((i * 1.7) % 12),
  deriva: ((i % 2 ? 1 : -1) * (14 + ((i * 11) % 40))),
  cor: CORES[i % CORES.length],
}));

/**
 * Brasas subindo ao fundo de uma seção. Ponha dentro de um elemento com position: relative e
 * overflow: hidden; o conteúdo da seção precisa ficar acima (position: relative) pra não ser coberto.
 * Só usa transform e opacity, e para por completo quando a pessoa pede menos movimento.
 */
@Component({
  selector: 'app-brasas',
  host: { 'aria-hidden': 'true' },
  template: `
    @for (b of brasas; track $index) {
      <span
        [style.--esq.%]="b.esq"
        [style.--tam.px]="b.tam"
        [style.--dur.s]="b.dur"
        [style.--atraso.s]="b.atraso"
        [style.--deriva.px]="b.deriva"
        [style.--cor]="b.cor"
      ></span>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      container-type: size;
    }
    span {
      position: absolute;
      bottom: -12px;
      left: var(--esq);
      width: var(--tam);
      height: var(--tam);
      border-radius: 50%;
      background: var(--cor);
      opacity: 0;
      animation: subir var(--dur) linear var(--atraso) infinite;
    }
    // sobe quase a altura toda da seção, balançando de lado, e apaga no caminho
    @keyframes subir {
      0% { opacity: 0; transform: translate3d(0, 0, 0); }
      12% { opacity: 1; }
      55% { opacity: 0.85; transform: translate3d(calc(var(--deriva) * -0.5), -55cqh, 0); }
      100% { opacity: 0; transform: translate3d(var(--deriva), -105cqh, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      span { animation: none; opacity: 0; }
    }
  `,
})
export class Brasas {
  protected readonly brasas = BRASAS;
}
