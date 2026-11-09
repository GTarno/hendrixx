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
    path: 'treinos',
    title: 'Meus treinos · Hendrixx',
    loadComponent: () =>
      import('./features/practices/my-practices.page').then((m) => m.MyPracticesPage),
  },
  {
    path: 'treino',
    title: 'Treino · Hendrixx',
    loadComponent: () =>
      import('./features/practice/practice-runner.page').then((m) => m.PracticeRunnerPage),
  },
  {
    path: 'instalar',
    title: 'Instalar o app · Hendrixx',
    loadComponent: () => import('./features/install/install.page').then((m) => m.InstallPage),
  },
  ...devRoutes,
  { path: '**', redirectTo: '' },
];
