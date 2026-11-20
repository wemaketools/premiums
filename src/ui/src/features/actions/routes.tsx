import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'actions',
    routes: [{ path: 'actions', load: () => import('./ActionsPage') }],
    nav: [{ id: 'actions', label: 'actions.nav', path: 'actions', order: 60, icon: 'listChecks' }],
  },
];
