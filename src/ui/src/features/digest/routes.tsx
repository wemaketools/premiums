import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'digest',
    routes: [{ path: 'digest', load: () => import('./DigestPage') }],
    nav: [{ id: 'digest', label: 'digest.nav', path: 'digest', order: 70, icon: 'printer' }],
  },
];
