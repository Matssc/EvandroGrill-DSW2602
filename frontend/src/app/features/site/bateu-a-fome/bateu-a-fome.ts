import { Component } from '@angular/core';
import { linkComoChegar } from '../../../core/contato';
import { Revelar } from '../../../shared/revelar/revelar';

// Faixa vermelha "Bateu a fome?" antes do rodapé (frame 15-2176)
@Component({
  selector: 'app-bateu-a-fome',
  imports: [Revelar],
  template: `
    <section class="cta">
      <div class="textos" revelar>
        <h2>Bateu a fome?</h2>
        <p>Venha comer um espeto na brasa.</p>
      </div>
      <a class="btn btn-claro" [href]="comoChegar" target="_blank" rel="noopener" revelar [atraso]="120">Como chegar</a>
    </section>
  `,
  styleUrl: './bateu-a-fome.scss',
})
export class BateuAFome {
  protected readonly comoChegar = linkComoChegar();
}
