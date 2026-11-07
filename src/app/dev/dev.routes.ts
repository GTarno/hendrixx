import { Routes } from '@angular/router';

/**
 * Rotas só de desenvolvimento. No build de produção este arquivo é trocado por
 * `dev.routes.prod.ts` (ver `fileReplacements` em angular.json), e as páginas daqui não
 * entram no bundle publicado.
 */
export const devRoutes: Routes = [
  {
    path: 'dev/acordes',
    title: 'Conferência dos diagramas · Hendrixx',
    loadComponent: () => import('./chord-review/chord-review.page').then((m) => m.ChordReviewPage),
  },
];
