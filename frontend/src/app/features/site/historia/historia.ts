import { Component } from '@angular/core';
import { Espeto, Peca } from '../../../shared/espeto/espeto';
import { Revelar } from '../../../shared/revelar/revelar';

/**
 * Foto do ambiente ou da churrasqueira. Enquanto não há foto, a seção mostra os espetos desenhados.
 * Quando tiver a foto, ponha o arquivo em public/ e troque null pelo nome dele (ex.: 'ambiente.jpg').
 */
const FOTO_DO_AMBIENTE: string | null = null;

// Seção "Nossa história" (frame 15-1665)
@Component({
  selector: 'app-historia',
  imports: [Espeto, Revelar],
  templateUrl: './historia.html',
  styleUrl: './historia.scss',
})
export class Historia {
  protected readonly foto = FOTO_DO_AMBIENTE;

  protected readonly diferenciais = [
    { titulo: 'Brasa de verdade', texto: 'Carvão e paciência: nada de chapa.' },
    { titulo: 'Carnes selecionadas', texto: 'Cortes escolhidos e temperados na casa.' },
    { titulo: 'Feito na hora', texto: 'Seu pedido sai quente, direto da grelha.' },
  ];

  protected readonly espetoUm: Peca[] = ['carne', 'pimentao', 'carne', 'cebola', 'carne'];
  protected readonly espetoDois: Peca[] = ['frango', 'bacon', 'frango', 'queijo', 'frango'];
  protected readonly espetoTres: Peca[] = ['linguica', 'pao', 'coracao', 'kafta', 'linguica'];
}
