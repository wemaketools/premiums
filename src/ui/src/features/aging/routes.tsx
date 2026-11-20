import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'aging',
    routes: [{ path: 'aging', load: () => import('./AgingPage') }],
    nav: [{ id: 'aging', label: 'aging.nav', path: 'aging', order: 20, icon: 'barChart' }],
  },
];
