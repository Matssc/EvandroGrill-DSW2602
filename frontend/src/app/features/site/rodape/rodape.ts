import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTATO, LINK_INSTAGRAM, linkWhatsApp } from '../../../core/contato';
import { hoje } from '../../../core/datas';
import { SECOES } from '../topo/topo';

// Rodapé da landing page (frame 15-2183), com o link pro painel administrativo.
@Component({
  selector: 'app-rodape',
  imports: [RouterLink],
  templateUrl: './rodape.html',
  styleUrl: './rodape.scss',
})
export class Rodape {
  protected readonly contato = CONTATO;
  protected readonly instagram = LINK_INSTAGRAM;
  protected readonly whatsapp = linkWhatsApp();
  protected readonly ano = hoje().slice(0, 4);
  // no rodapé o Instagram fica de fora da navegação, como no Figma
  protected readonly secoes = SECOES.filter((s) => s.ancora !== 'instagram');
}
