import { Component } from '@angular/core';
import { Instagram as IconeInstagram, LucideAngularModule } from 'lucide-angular';
import { CONTATO, LINK_INSTAGRAM } from '../../../core/contato';
import { Revelar } from '../../../shared/revelar/revelar';

// Seção do Instagram (frame 15-2080): o perfil em letras grandes e o botão que leva pra ele.
@Component({
  selector: 'app-instagram',
  imports: [LucideAngularModule, Revelar],
  templateUrl: './instagram.html',
  styleUrl: './instagram.scss',
})
export class Instagram {
  protected readonly perfil = CONTATO.instagram;
  protected readonly link = LINK_INSTAGRAM;
  protected readonly icones = { IconeInstagram };
}
