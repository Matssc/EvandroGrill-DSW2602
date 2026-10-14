import { Component } from '@angular/core';
import { linkWhatsApp } from '../../../core/contato';

// Faixa vermelha "Bateu a fome?" antes do rodapé (frame 15-2176)
@Component({
  selector: 'app-bateu-a-fome',
  template: `
    <section class="cta">
      <div class="textos">
        <h2>Bateu a fome?</h2>
        <p>Faça seu pedido pelo WhatsApp em poucos cliques.</p>
      </div>
      <a class="btn btn-claro" [href]="whatsapp" target="_blank" rel="noopener">Chamar no WhatsApp</a>
    </section>
  `,
  styleUrl: './bateu-a-fome.scss',
})
export class BateuAFome {
  protected readonly whatsapp = linkWhatsApp();
}
