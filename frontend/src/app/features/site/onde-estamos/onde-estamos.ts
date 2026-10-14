import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Clock, LucideAngularModule, MapPin } from 'lucide-angular';
import { CONTATO, linkComoChegar, linkDoMapa, linkWhatsApp } from '../../../core/contato';
import { IconeWhatsapp } from '../../../shared/icone-whatsapp/icone-whatsapp';

// Seção "Onde estamos" (frame 15-2121 do Figma), com o mapa do Google.
@Component({
  selector: 'app-onde-estamos',
  imports: [LucideAngularModule, IconeWhatsapp],
  templateUrl: './onde-estamos.html',
  styleUrl: './onde-estamos.scss',
})
export class OndeEstamos {
  protected readonly contato = CONTATO;
  protected readonly whatsapp = linkWhatsApp();
  protected readonly comoChegar = linkComoChegar();
  // O Angular só deixa um iframe abrir um endereço que a gente marcou como confiável
  protected readonly mapa = inject(DomSanitizer).bypassSecurityTrustResourceUrl(linkDoMapa());
  protected readonly icones = { Clock, MapPin };
}
