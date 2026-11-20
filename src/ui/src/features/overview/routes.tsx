import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'overview',
    routes: [{ path: 'overview', load: () => import('./OverviewPage') }],
    nav: [
      { id: 'overview', label: 'overview.nav', path: 'overview', order: 10, icon: 'dashboard' },
    ],
  },
];
