import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
  standalone: true,
  template: '<section class="page-placeholder" aria-label="Consulta de lotes"></section>',
  styles: ['.page-placeholder { min-height: 240px; }']
})
class BatchConsultationPage {}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'contabilidade/outros-creditos-debitos' },
  {
    path: 'contabilidade/outros-creditos-debitos',
    component: BatchConsultationPage,
    title: 'Outros Créditos/Débitos'
  },
  { path: '**', redirectTo: 'contabilidade/outros-creditos-debitos' }
];
