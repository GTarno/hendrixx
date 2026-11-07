import { Routes } from '@angular/router';
import { devRoutes } from './dev/dev.routes';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Montar treino · Hendrixx',
    loadComponent: () =>
      import('./features/setup/practice-setup.page').then((m) => m.PracticeSetupPage),
  },
  {
    path: 'treino',
    title: 'Treino · Hendrixx',
    loadComponent: () =>
      import('./features/practice/practice-runner.page').then((m) => m.PracticeRunnerPage),
  },
  ...devRoutes,
  { path: '**', redirectTo: '' },
];
