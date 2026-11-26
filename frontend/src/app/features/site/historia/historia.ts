import { Component } from '@angular/core';
import { Espeto, Peca } from '../../../shared/espeto/espeto';
import { Revelar } from '../../../shared/revelar/revelar';

/**
 * Foto do salão (fica em public/). Com null, a seção volta a mostrar os espetos desenhados.
 */
const FOTO_DO_AMBIENTE: string | null = 'ambiente.jpg';

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
