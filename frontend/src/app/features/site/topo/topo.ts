import { Component, signal } from '@angular/core';
import { LucideAngularModule, Menu, X } from 'lucide-angular';
import { linkComoChegar } from '../../../core/contato';

/** Âncoras das seções da landing page (o id de cada <section>). */
export const SECOES = [
  { ancora: 'inicio', texto: 'Início' },
  { ancora: 'sobre', texto: 'Sobre' },
  { ancora: 'cardapio', texto: 'Cardápio' },
  { ancora: 'instagram', texto: 'Instagram' },
  { ancora: 'onde-estamos', texto: 'Onde estamos' },
];

// Navbar fixa no topo. No celular os links viram um menu que abre no botão.
@Component({
  selector: 'app-topo',
  imports: [LucideAngularModule],
  templateUrl: './topo.html',
  styleUrl: './topo.scss',
})
export class Topo {
  protected readonly secoes = SECOES;
  protected readonly comoChegar = linkComoChegar();
  protected readonly icones = { Menu, X };
  protected readonly menuAberto = signal(false);
}
