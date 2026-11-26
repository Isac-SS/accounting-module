import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'contabilidade/outros-creditos-debitos' },
  {
    path: 'contabilidade/outros-creditos-debitos',
    loadComponent: () => import('./features/batch-consultation/presentation/batch-consultation.page')
      .then((module) => module.BatchConsultationPage),
    title: 'Outros Créditos/Débitos'
  },
  { path: '**', redirectTo: 'contabilidade/outros-creditos-debitos' }
];
