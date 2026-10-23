import { Component } from '@angular/core';
import { Espeto, Peca } from '../../../shared/espeto/espeto';

// Lado escuro do login (o mesmo do Figma)
@Component({
  selector: 'app-painel-marca',
  imports: [Espeto],
  template: `
    <div class="conteudo">
      <img src="logo.jpg" alt="Evandro's Grill" width="128" height="128" />
      <h2 class="t-display">Painel administrativo</h2>
      <p class="texto">Espetaria artesanal. Vendas do dia, compras, pró-labore e reserva da empresa num lugar só.</p>
    </div>
    <div class="espetos" aria-hidden="true">
      <app-espeto [pecas]="espetoDeCima" [quantidade]="5" [inclinacao]="-8" />
      <app-espeto [pecas]="espetoDeBaixo" [quantidade]="5" [inclinacao]="-8" />
    </div>
  `,
  styles: `
    :host {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 48px 32px 24px;
      text-align: center;
      color: var(--creme);
      background: var(--carvao);
    }
    // logo e textos no meio do espaço que sobra; os espetos ficam embaixo, sem nunca passar por cima do texto
    .conteudo {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    img {
      border-radius: 50%;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 64px;
      line-height: 0.95;
      text-transform: uppercase;
    }
    .texto {
      max-width: 360px;
      font-size: 16px;
      color: var(--n-200);
    }
    // os espetos do Figma no pé do painel, saindo pela esquerda; em tela baixa eles diminuem
    .espetos {
      display: grid;
      align-self: flex-start;
      width: min(78%, 560px, 55vh);
      margin: 32px 0 0 calc(-32px - 2%);
    }
    .espetos app-espeto:last-child {
      margin: -8% 0 0 4%;
    }
    @media (max-width: 900px), (max-height: 620px) {
      .espetos {
        display: none;
      }
    }
  `,
})
export class PainelMarca {
  protected readonly espetoDeCima: Peca[] = ['carne', 'pimentao', 'carne', 'cebola', 'carne'];
  protected readonly espetoDeBaixo: Peca[] = ['frango', 'bacon', 'frango', 'queijo', 'frango'];
}
