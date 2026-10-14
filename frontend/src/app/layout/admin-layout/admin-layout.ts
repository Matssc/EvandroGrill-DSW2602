import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  Banknote,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Globe,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  Menu,
  PiggyBank,
  ReceiptText,
  Settings,
  ShoppingCart,
  Utensils,
} from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';

interface ItemMenu {
  texto: string;
  rota: string;
  icone: LucideIconData;
}

// Mesmos grupos e itens da sidebar do Figma
const MENU: { titulo: string; itens: ItemMenu[] }[] = [
  { titulo: 'Visão geral', itens: [{ texto: 'Dashboard', rota: '/admin/dashboard', icone: LayoutDashboard }] },
  { titulo: 'Dia a dia', itens: [{ texto: 'Vendas do dia', rota: '/admin/vendas', icone: ReceiptText }] },
  {
    titulo: 'Financeiro',
    itens: [
      { texto: 'Compras', rota: '/admin/compras', icone: ShoppingCart },
      { texto: 'Cartões PJ', rota: '/admin/cartoes', icone: CreditCard },
      { texto: 'Pró-labore', rota: '/admin/pro-labore', icone: Banknote },
      { texto: 'Reserva', rota: '/admin/reserva', icone: PiggyBank },
      { texto: 'Fechamento do mês', rota: '/admin/fechamento', icone: CalendarDays },
    ],
  },
  { titulo: 'Site', itens: [{ texto: 'Produtos do site', rota: '/admin/produtos', icone: Utensils }] },
  { titulo: 'Conta', itens: [{ texto: 'Configurações', rota: '/admin/configuracoes', icone: Settings }] },
];

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  protected readonly menu = MENU;
  protected readonly icones = { Globe, ExternalLink, LogOut, Menu };
  protected readonly menuAberto = signal(false); // só no celular

  protected readonly usuario = this.auth.usuario;
  protected readonly iniciais = computed(() => {
    const partes = (this.usuario()?.nome ?? '').trim().split(/\s+/);
    const texto = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].slice(0, 2);
    return texto.toUpperCase();
  });
}