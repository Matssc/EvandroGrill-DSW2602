import { Component } from '@angular/core';
import { Flame, LucideAngularModule } from 'lucide-angular';

// Faixa vermelha embaixo do hero (frame 15-1649). O texto passa sozinho, em loop.
@Component({
  selector: 'app-faixa',
  imports: [LucideAngularModule],
  templateUrl: './faixa.html',
  styleUrl: './faixa.scss',
})
export class Faixa {
  protected readonly frases = ['Espetos artesanais', 'Feitos na brasa', 'Pedidos pelo WhatsApp', 'Bragança Paulista'];
  protected readonly chama = Flame;
}
