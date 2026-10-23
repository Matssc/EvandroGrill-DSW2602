import { Directive, ElementRef, afterNextRender, inject, input, OnDestroy } from '@angular/core';

/**
 * Faz o elemento subir e aparecer quando entra na tela, uma vez só.
 * Uso: <h2 revelar>, ou <li revelar [atraso]="80"> pra escalonar uma lista.
 * Sem IntersectionObserver ou com "menos movimento" ligado, o elemento fica parado e visível.
 */
@Directive({ selector: '[revelar]' })
export class Revelar implements OnDestroy {
  /** Espera em ms antes de começar, pra entrar um depois do outro. */
  readonly atraso = input(0);

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observador?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      const quietos = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (quietos || typeof IntersectionObserver === 'undefined') return;

      // quem já está na tela ao carregar entra sem esperar rolagem
      this.el.style.setProperty('--atraso', `${this.atraso()}ms`);
      this.el.classList.add('revelar');
      this.observador = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting) return;
          this.el.classList.add('entrou');
          this.observador?.disconnect();
        },
        { threshold: 0.12 },
      );
      this.observador.observe(this.el);
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }
}
